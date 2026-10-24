import { solveQuestion, matchOptionValue } from "./cbt-solver";

export interface ParsedQuestion {
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  marks: number;
  explanation?: string;
  detectedFrom?: string; // Information on how the correct answer was detected
  confidence?: "high" | "medium" | "low";
  warnings?: string[];
}

export interface ParseResult {
  questions: ParsedQuestion[];
  totalQuestions: number;
  totalMarks: number;
  unresolvedAnswersCount: number;
  warnings: string[];
}

/**
 * Clean text lines, removing trailing CR and excess whitespace.
 */
function cleanText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Extract trailing answer keys like:
 * ANSWERS:
 * 1. A
 * 2. C
 * or 1-A, 2-C
 * or Answers: B, C, D, A
 */
function extractTrailingAnswerKeys(rawText: string): {
  bodyText: string;
  answerMap: Map<number, "A" | "B" | "C" | "D">;
} {
  const answerMap = new Map<number, "A" | "B" | "C" | "D">();
  const text = cleanText(rawText);

  // Match answer key header
  const answerSectionRegex = /\n\s*(?:ANSWERS?|ANSWER\s+KEYS?|KEYS?|SOLUTIONS?)\s*[:\-]?\s*\n([\s\S]+)$/i;
  const match = text.match(answerSectionRegex);

  let bodyText = text;
  if (match) {
    bodyText = text.substring(0, match.index).trim();
    const answerSection = match[1];

    // Pattern 1: "1. A" or "1) B" or "1 - C" or "1: D" or "Q1. A"
    const lineRegex = /(?:Q\s*)?(\d+)[\.\)\:\-]?\s*(?:option\s*)?\(?([A-D])\)?\b/gi;
    let m: RegExpExecArray | null;
    while ((m = lineRegex.exec(answerSection)) !== null) {
      const qNum = parseInt(m[1], 10);
      const ans = m[2].toUpperCase() as "A" | "B" | "C" | "D";
      if (!isNaN(qNum) && ["A", "B", "C", "D"].includes(ans)) {
        answerMap.set(qNum, ans);
      }
    }

    // Pattern 2: Comma or space separated letters: e.g. "Answers: A, B, C, D"
    if (answerMap.size === 0) {
      const simpleSeqRegex = /\b([A-D])\b/gi;
      let seqIndex = 1;
      while ((m = simpleSeqRegex.exec(answerSection)) !== null) {
        const ans = m[1].toUpperCase() as "A" | "B" | "C" | "D";
        answerMap.set(seqIndex++, ans);
      }
    }
  }

  return { bodyText, answerMap };
}

/**
 * Parse raw exam questions text and automatically detect right answers with intelligent solving.
 */
export function parseExamQuestions(
  rawText: string,
  defaultMarksPerQuestion = 5
): ParseResult {
  const warnings: string[] = [];
  if (!rawText || !rawText.trim()) {
    return {
      questions: [],
      totalQuestions: 0,
      totalMarks: 0,
      unresolvedAnswersCount: 0,
      warnings: ["No text provided for parsing."],
    };
  }

  const { bodyText, answerMap } = extractTrailingAnswerKeys(rawText);

  // Split into candidate question blocks.
  // Look for lines starting with question numbers: e.g. "1.", "1)", "Q1.", "Q1:", "Question 1:", "[1]"
  const lines = bodyText.split("\n");
  const questionBlocks: string[] = [];
  let currentBlockLines: string[] = [];

  const isQuestionStart = (line: string): boolean => {
    const trimmed = line.trim();
    return /^(?:(?:Q|Question)\s*\d+[\.\:\)\-]?|\d+[\.\)\:\-]|\[\d+\])\s+[^\s]/i.test(
      trimmed
    );
  };

  for (const line of lines) {
    if (isQuestionStart(line) && currentBlockLines.length > 0) {
      questionBlocks.push(currentBlockLines.join("\n"));
      currentBlockLines = [line];
    } else {
      currentBlockLines.push(line);
    }
  }
  if (currentBlockLines.length > 0) {
    questionBlocks.push(currentBlockLines.join("\n"));
  }

  // If no numbered blocks were found, treat double newline as separator
  let finalBlocks = questionBlocks.filter((b) => b.trim().length > 0);
  if (finalBlocks.length <= 1 && bodyText.includes("\n\n")) {
    const splitByEmptyLine = bodyText
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);
    if (splitByEmptyLine.length > 1) {
      finalBlocks = splitByEmptyLine;
    }
  }

  const parsedQuestions: ParsedQuestion[] = [];
  let unresolvedCount = 0;

  finalBlocks.forEach((block, index) => {
    const qNumber = index + 1;
    const blockLines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    let detectedAnswer: "A" | "B" | "C" | "D" | null = null;
    let detectionMethod = "";
    let confidence: "high" | "medium" | "low" = "medium";
    let questionText = "";
    const options: { A: string; B: string; C: string; D: string } = {
      A: "",
      B: "",
      C: "",
      D: "",
    };
    let explicitAnswerRaw = "";
    let explanation = "";
    const qWarnings: string[] = [];

    // Check if answer was in trailing answer key
    if (answerMap.has(qNumber)) {
      detectedAnswer = answerMap.get(qNumber)!;
      detectionMethod = "Answer key section at bottom";
      confidence = "high";
    }

    let parsingOptions = false;
    const questionTextLines: string[] = [];

    for (const rawLine of blockLines) {
      // 1. Check for explicit answer lines e.g.:
      // "Answer: B", "Ans: B", "Correct: B", "Answer = B", "Ans is B", "Answer: Option B", "Ans: Abuja"
      const ansLinePrefixMatch = rawLine.match(
        /^(?:(?:Correct\s+)?Answer|Ans|Key|Correct(?:\s+Option)?|Right\s+Answer|Solution)\s*[:=\-]?\s*(?:is\s*)?(?:Option\s*)?(.*)/i
      );

      if (ansLinePrefixMatch) {
        explicitAnswerRaw = ansLinePrefixMatch[1].trim();

        // Check if raw is a single letter e.g. "B", "(B)", "[B]", "B."
        const singleLetterMatch = explicitAnswerRaw.match(/^\(?([A-D])\)?(?:[\.\:\-\s]|$)/i);
        if (singleLetterMatch) {
          detectedAnswer = singleLetterMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
          detectionMethod = `Explicit "${rawLine}" tag`;
          confidence = "high";
          // If there's extra text, treat as explanation
          const remaining = explicitAnswerRaw.replace(/^\(?([A-D])\)?[\.\:\-\s]*/i, "").trim();
          if (remaining && !explanation) explanation = remaining;
          continue;
        }
      }

      // Check for explanation lines
      const expLineMatch = rawLine.match(/^(?:Explanation|Remark|Note|Reason)\s*[:\-]\s*(.+)/i);
      if (expLineMatch) {
        explanation = expLineMatch[1].trim();
        continue;
      }

      // 2. Check for Option lines:
      // Supports "A) ...", "A. ...", "(A) ...", "[x] A)", "*A) ...*", "**A)** ...", "A: ..."
      const isAsteriskMarked =
        /^\*{1,2}[A-D][\.\)]/i.test(rawLine) ||
        /\*{1,2}[A-D]\b/i.test(rawLine) ||
        rawLine.endsWith("*") ||
        rawLine.endsWith("**") ||
        /\(correct\)/i.test(rawLine) ||
        /\[correct\]/i.test(rawLine) ||
        /\b(?:correct\s+answer|right\s+answer|ans)\b/i.test(rawLine) ||
        /\[x\]/i.test(rawLine) ||
        /✓|✔/i.test(rawLine);

      const cleanLine = rawLine
        .replace(/^\[[x\s]\]\s*/i, "")
        .replace(/^[✓✔]\s*/, "")
        .trim();

      const optionMatch = cleanLine.match(
        /^\*{0,2}\(?([A-D])\)?[\.\-\:\)]\s*(.+)/i
      );

      if (optionMatch) {
        parsingOptions = true;
        const optLetter = optionMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
        let optText = optionMatch[2].replace(/\*+/g, "").trim();

        // Check if option text has inline marker (Correct), [x], or (Ans)
        if (
          /\((?:correct|true|right|ans)\)/i.test(optText) ||
          /\[(?:correct|true|right|ans)\]/i.test(optText) ||
          /-\s*(?:correct|ans)\b/i.test(optText)
        ) {
          detectedAnswer = optLetter;
          detectionMethod = `Marked with (Correct) tag on option ${optLetter}`;
          confidence = "high";
          optText = optText
            .replace(/\s*\((?:correct|true|right|ans)\)/i, "")
            .replace(/\s*\[(?:correct|true|right|ans)\]/i, "")
            .replace(/\s*-\s*(?:correct|ans)\b/i, "")
            .trim();
        } else if (isAsteriskMarked && !detectedAnswer) {
          detectedAnswer = optLetter;
          detectionMethod = `Asterisk/Checkmark marker on option ${optLetter}`;
          confidence = "high";
        }

        options[optLetter] = optText;
        continue;
      }

      // 3. Multi-option on single line: "A) 50  B) 60  C) 70  D) 45"
      const inlineOptionsMatch = rawLine.match(
        /\(?[A]\)?[\.\-\)]\s+(.+?)\s+\(?[B]\)?[\.\-\)]\s+(.+?)\s+\(?[C]\)?[\.\-\)]\s+(.+?)\s+\(?[D]\)?[\.\-\)]\s+(.+)/i
      );
      if (inlineOptionsMatch) {
        parsingOptions = true;
        options.A = inlineOptionsMatch[1].trim();
        options.B = inlineOptionsMatch[2].trim();
        options.C = inlineOptionsMatch[3].trim();
        options.D = inlineOptionsMatch[4].trim();
        continue;
      }

      // If we haven't reached options, it's part of question text
      if (!parsingOptions) {
        let qLine = rawLine;
        if (questionTextLines.length === 0) {
          qLine = qLine.replace(
            /^(?:(?:Q|Question)\s*\d+[\.\:\)\-]?|\d+[\.\)\:\-]|\[\d+\])\s*/i,
            ""
          );
        }
        questionTextLines.push(qLine.trim());
      } else {
        // Line after options that didn't match option regex
        if (/^(?:Ans|Answer|Key|Correct)\b/i.test(rawLine)) {
          const m = rawLine.match(/\b([A-D])\b/i);
          if (m) {
            detectedAnswer = m[1].toUpperCase() as "A" | "B" | "C" | "D";
            detectionMethod = `Answer tag "${rawLine}"`;
            confidence = "high";
          }
        }
      }
    }

    questionText = questionTextLines.join(" ").trim();

    // Check if question text itself has embedded answer e.g. "What is 5 x 5? (Ans: B)"
    if (!detectedAnswer) {
      const embeddedAnsMatch = questionText.match(/\((?:ans|answer|correct)[:\s]+([A-D])\)/i);
      if (embeddedAnsMatch) {
        detectedAnswer = embeddedAnsMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
        detectionMethod = `Embedded answer tag in question: "${embeddedAnsMatch[0]}"`;
        confidence = "high";
        questionText = questionText.replace(/\((?:ans|answer|correct)[:\s]+[A-D]\)/i, "").trim();
      }
    }

    // Fallback extraction if options are all inside questionText
    if (!options.A && !options.B) {
      const inlineMatch = questionText.match(
        /^(.*?)\s+A[\)\.\-]\s+(.+?)\s+B[\)\.\-]\s+(.+?)\s+C[\)\.\-]\s+(.+?)\s+D[\)\.\-]\s+(.+)$/i
      );
      if (inlineMatch) {
        questionText = inlineMatch[1].trim();
        options.A = inlineMatch[2].trim();
        options.B = inlineMatch[3].trim();
        options.C = inlineMatch[4].trim();
        options.D = inlineMatch[5].trim();
      }
    }

    // 4. If explicit answer text was provided as words/numbers (e.g. "Answer: 60" or "Answer: Abuja")
    // match it against Option values!
    if (!detectedAnswer && explicitAnswerRaw) {
      const matchedByText = matchOptionValue(explicitAnswerRaw, options);
      if (matchedByText) {
        detectedAnswer = matchedByText;
        detectionMethod = `Matched explicit answer text "${explicitAnswerRaw}" to Option ${matchedByText}`;
        confidence = "high";
      }
    }

    // 5. Check if any option has internal asterisk e.g. "Option text*"
    if (!detectedAnswer) {
      for (const optKey of ["A", "B", "C", "D"] as const) {
        if (options[optKey].includes("*")) {
          detectedAnswer = optKey;
          detectionMethod = `Asterisk marker inside option ${optKey}`;
          confidence = "high";
          options[optKey] = options[optKey].replace(/\*/g, "").trim();
          break;
        }
      }
    }

    // 6. INTELLIGENT QUESTION SOLVER (Math, Science, Geography, English, Curriculum facts)
    // If no answer has been explicitly marked, let the system solve the question!
    if (!detectedAnswer) {
      const solveResult = solveQuestion(questionText, options);
      if (solveResult.detectedAnswer) {
        detectedAnswer = solveResult.detectedAnswer;
        detectionMethod = `Intelligent Solver: ${solveResult.reason}`;
        confidence = solveResult.confidence;
        if (!explanation) explanation = solveResult.reason;
      }
    }

    // 7. If still unresolved, default to "A" with low confidence and clear warning
    if (!detectedAnswer) {
      detectedAnswer = "A";
      detectionMethod = "Unresolved (Defaulted to A - Please click correct option)";
      confidence = "low";
      unresolvedCount++;
      qWarnings.push(
        "Could not detect right answer automatically. Defaulted to Option A; please click the correct option to confirm."
      );
    }

    if (!questionText) {
      questionText = `Question ${qNumber}`;
      qWarnings.push("Question text was empty.");
    }

    parsedQuestions.push({
      questionNumber: qNumber,
      questionText,
      optionA: options.A || "Option A",
      optionB: options.B || "Option B",
      optionC: options.C || "Option C",
      optionD: options.D || "Option D",
      correctAnswer: detectedAnswer,
      marks: defaultMarksPerQuestion,
      explanation: explanation || undefined,
      detectedFrom: detectionMethod,
      confidence,
      warnings: qWarnings.length > 0 ? qWarnings : undefined,
    });
  });

  const totalMarks = parsedQuestions.reduce((sum, q) => sum + q.marks, 0);

  return {
    questions: parsedQuestions,
    totalQuestions: parsedQuestions.length,
    totalMarks,
    unresolvedAnswersCount: unresolvedCount,
    warnings,
  };
}
