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
 * Parse an answer key string into a Map of questionNumber -> "A" | "B" | "C" | "D".
 * Supports:
 * 1. Numbered pairs: "1. B, 2. C, 3. A" or "1-B\n2-C" or "1:B, 2:D" or "Q1: B, Q2: C" or "1) B"
 * 2. Letter sequence: "B, C, A, D, B" or "B C A D B" or unbroken "BCADB" or line-by-line "B\nC\nA"
 * 3. Text answers: "1. 60\n2. 48\n3. Abuja" (when options are available)
 */
export function parseAnswerKey(
  rawKeyText: string,
  questions?: Array<{ optionA: string; optionB: string; optionC: string; optionD: string }>
): Map<number, "A" | "B" | "C" | "D"> {
  const answerMap = new Map<number, "A" | "B" | "C" | "D">();
  if (!rawKeyText || !rawKeyText.trim()) return answerMap;

  const text = cleanText(rawKeyText).trim();

  // Pattern 1: Numbered pairs e.g. "1. B" or "1) B" or "1 - B" or "1: B" or "Q1. B" or "Q1: Option B"
  const numberedRegex = /(?:Q\s*)?(\d+)[\.\)\:\-\=\s]+(?:Option\s*)?\(?([A-D])\)?(?=[\s,\.\;\)]|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = numberedRegex.exec(text)) !== null) {
    const qNum = parseInt(m[1], 10);
    const ans = m[2].toUpperCase() as "A" | "B" | "C" | "D";
    if (!isNaN(qNum) && ["A", "B", "C", "D"].includes(ans)) {
      answerMap.set(qNum, ans);
    }
  }

  if (answerMap.size > 0) {
    return answerMap;
  }

  // Pattern 2: Comma / space / newline separated sequence of single letters:
  // e.g. "B, C, B, D, B" or "B C B D B" or "B\nC\nB\nD\nB"
  const tokens = text
    .split(/[\s,\t\r\n;]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);

  const allSingleLetters = tokens.every((t) => /^[A-D]$/.test(t));
  if (tokens.length > 0 && allSingleLetters) {
    tokens.forEach((token, idx) => {
      answerMap.set(idx + 1, token as "A" | "B" | "C" | "D");
    });
    return answerMap;
  }

  // Pattern 3: Single unbroken string of letters e.g. "BCBDB"
  const compactStr = text.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (compactStr.length >= 2 && /^[A-D]+$/.test(compactStr)) {
    for (let i = 0; i < compactStr.length; i++) {
      answerMap.set(i + 1, compactStr[i] as "A" | "B" | "C" | "D");
    }
    return answerMap;
  }

  // Pattern 4: Numbered text answers: "1. Abuja", "2. 60"
  if (questions && questions.length > 0) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    lines.forEach((line) => {
      const match = line.match(/(?:Q\s*)?(\d+)[\.\)\:\-\=]?\s*(.+)/i);
      if (match) {
        const qNum = parseInt(match[1], 10);
        const ansText = match[2].trim();
        const qIndex = qNum - 1;
        if (qIndex >= 0 && qIndex < questions.length) {
          const matchedLetter = matchOptionValue(ansText, {
            A: questions[qIndex].optionA,
            B: questions[qIndex].optionB,
            C: questions[qIndex].optionC,
            D: questions[qIndex].optionD,
          });
          if (matchedLetter) {
            answerMap.set(qNum, matchedLetter);
          }
        }
      }
    });
  }

  return answerMap;
}

/**
 * Apply a pasted answer key string directly onto an existing array of parsed questions.
 */
export function applyAnswerKeyToQuestions(
  questions: ParsedQuestion[],
  rawAnswerKey: string
): ParsedQuestion[] {
  if (!rawAnswerKey || !rawAnswerKey.trim()) return questions;

  const answerMap = parseAnswerKey(rawAnswerKey, questions);
  if (answerMap.size === 0) return questions;

  return questions.map((q) => {
    if (answerMap.has(q.questionNumber)) {
      const rightOption = answerMap.get(q.questionNumber)!;
      return {
        ...q,
        correctAnswer: rightOption,
        confidence: "high" as const,
        detectedFrom: `Teacher Pasted Right Option: Option ${rightOption}`,
      };
    }
    return q;
  });
}

/**
 * Extract trailing answer keys from question body if present at the end
 */
function extractTrailingAnswerKeys(rawText: string): {
  bodyText: string;
  answerMap: Map<number, "A" | "B" | "C" | "D">;
} {
  const text = cleanText(rawText);

  // Match answer key header
  const answerSectionRegex = /\n\s*(?:ANSWERS?|ANSWER\s+KEYS?|KEYS?|SOLUTIONS?|MARKING\s+GUIDE)\s*[:\-]?\s*\n([\s\S]+)$/i;
  const match = text.match(answerSectionRegex);

  let bodyText = text;
  let answerMap = new Map<number, "A" | "B" | "C" | "D">();

  if (match) {
    bodyText = text.substring(0, match.index).trim();
    const answerSection = match[1];
    answerMap = parseAnswerKey(answerSection);
  }

  return { bodyText, answerMap };
}

/**
 * Parse raw exam questions text and automatically detect or apply right answers.
 */
export function parseExamQuestions(
  rawText: string,
  defaultMarksPerQuestion = 5,
  pastedAnswerKey = ""
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

  const { bodyText, answerMap: embeddedAnswerMap } = extractTrailingAnswerKeys(rawText);

  // Parse standalone pasted answer key if provided
  const explicitKeyMap = pastedAnswerKey ? parseAnswerKey(pastedAnswerKey) : new Map();

  // Split into candidate question blocks.
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

    // Priority 1: Pasted Answer Key
    if (explicitKeyMap.has(qNumber)) {
      detectedAnswer = explicitKeyMap.get(qNumber)!;
      detectionMethod = `Teacher Pasted Answer Key: Option ${detectedAnswer}`;
      confidence = "high";
    } else if (embeddedAnswerMap.has(qNumber)) {
      detectedAnswer = embeddedAnswerMap.get(qNumber)!;
      detectionMethod = `Answer key section at bottom: Option ${detectedAnswer}`;
      confidence = "high";
    }

    let parsingOptions = false;
    const questionTextLines: string[] = [];

    for (const rawLine of blockLines) {
      // Check for explicit answer lines e.g.:
      // "Answer: B", "Ans: B", "Correct: B", "Answer = B", "Ans is B", "Answer: Option B", "Ans: Abuja"
      const ansLinePrefixMatch = rawLine.match(
        /^(?:(?:Correct\s+)?Answer|Ans|Key|Correct(?:\s+Option)?|Right\s+Answer|Solution|Option)\s*[:=\-]?\s*(?:is\s*)?(?:Option\s*)?(.*)/i
      );

      if (ansLinePrefixMatch) {
        explicitAnswerRaw = ansLinePrefixMatch[1].trim();
        const singleLetterMatch = explicitAnswerRaw.match(/^\(?([A-D])\)?(?:[\.\:\-\s]|$)/i);
        if (singleLetterMatch) {
          if (!detectedAnswer) {
            detectedAnswer = singleLetterMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
            detectionMethod = `Explicit "${rawLine}" tag`;
            confidence = "high";
          }
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

      // Check for Option lines:
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

        if (
          /\((?:correct|true|right|ans)\)/i.test(optText) ||
          /\[(?:correct|true|right|ans)\]/i.test(optText) ||
          /-\s*(?:correct|ans)\b/i.test(optText)
        ) {
          if (!detectedAnswer) {
            detectedAnswer = optLetter;
            detectionMethod = `Marked with (Correct) tag on option ${optLetter}`;
            confidence = "high";
          }
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

      // Multi-option on single line: "A) 50  B) 60  C) 70  D) 45"
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
        if (/^(?:Ans|Answer|Key|Correct)\b/i.test(rawLine) && !detectedAnswer) {
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

    // Check if question text itself has embedded answer
    if (!detectedAnswer) {
      const embeddedAnsMatch = questionText.match(/\((?:ans|answer|correct)[:\s]+([A-D])\)/i);
      if (embeddedAnsMatch) {
        detectedAnswer = embeddedAnsMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
        detectionMethod = `Embedded answer tag in question: "${embeddedAnsMatch[0]}"`;
        confidence = "high";
        questionText = questionText.replace(/\((?:ans|answer|correct)[:\s]+[A-D]\)/i, "").trim();
      }
    }

    // Match explicit answer text to options if answer was written as words/numbers (e.g. "Answer: Abuja")
    if (!detectedAnswer && explicitAnswerRaw) {
      const matchedByText = matchOptionValue(explicitAnswerRaw, options);
      if (matchedByText) {
        detectedAnswer = matchedByText;
        detectionMethod = `Matched answer text "${explicitAnswerRaw}" to Option ${matchedByText}`;
        confidence = "high";
      }
    }

    // Option internal asterisk
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

    // Intelligent Curriculum & Math Question Solver
    if (!detectedAnswer) {
      const solveResult = solveQuestion(questionText, options);
      if (solveResult.detectedAnswer) {
        detectedAnswer = solveResult.detectedAnswer;
        detectionMethod = `Intelligent Solver: ${solveResult.reason}`;
        confidence = solveResult.confidence;
        if (!explanation) explanation = solveResult.reason;
      }
    }

    // Fallback if still unresolved
    if (!detectedAnswer) {
      detectedAnswer = "A";
      detectionMethod = "Unresolved (Defaulted to A - Please paste right options or click option)";
      confidence = "low";
      unresolvedCount++;
      qWarnings.push(
        "Could not detect right answer automatically. Please paste right options in the Answer Key box or click the correct option."
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
