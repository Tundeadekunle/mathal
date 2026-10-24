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

    // Pattern 1: "1. A" or "1) B" or "1 - C" or "1: D"
    const lineRegex = /(?:Q\s*)?(\d+)[\.\)\:\-]\s*\(?([A-D])\)?/gi;
    let m: RegExpExecArray | null;
    while ((m = lineRegex.exec(answerSection)) !== null) {
      const qNum = parseInt(m[1], 10);
      const ans = m[2].toUpperCase() as "A" | "B" | "C" | "D";
      if (!isNaN(qNum) && ["A", "B", "C", "D"].includes(ans)) {
        answerMap.set(qNum, ans);
      }
    }

    // Pattern 2: Comma or space separated e.g., "1.A, 2.B, 3.C"
    if (answerMap.size === 0) {
      const csvRegex = /(\d+)\s*[\.\:\-]?\s*([A-D])\b/gi;
      while ((m = csvRegex.exec(answerSection)) !== null) {
        const qNum = parseInt(m[1], 10);
        const ans = m[2].toUpperCase() as "A" | "B" | "C" | "D";
        answerMap.set(qNum, ans);
      }
    }
  }

  return { bodyText, answerMap };
}

/**
 * Parse raw exam questions text and automatically detect right answers.
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
    let questionText = "";
    const options: { A: string; B: string; C: string; D: string } = {
      A: "",
      B: "",
      C: "",
      D: "",
    };
    let explanation = "";
    const qWarnings: string[] = [];

    // Check if answer was in trailing answer key
    if (answerMap.has(qNumber)) {
      detectedAnswer = answerMap.get(qNumber)!;
      detectionMethod = "Answer key section at bottom";
    }

    // Inspect lines for options, inline answers, and question statement
    let parsingOptions = false;
    const questionTextLines: string[] = [];

    for (const rawLine of blockLines) {
      // 1. Check for explicit answer lines e.g.:
      // "Answer: B", "Ans: B", "Correct Answer: B", "Key: B", "Correct: B"
      const ansLineMatch = rawLine.match(
        /^(?:(?:Correct\s+)?Answer|Ans|Key|Correct)\s*[:\-]?\s*\(?([A-D])\)?(?:\s*[\.\:\-]|\s*$|\s+(.*))/i
      );
      if (ansLineMatch) {
        detectedAnswer = ansLineMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
        detectionMethod = `Explicit "${rawLine}" line`;
        if (ansLineMatch[2] && !explanation) {
          explanation = ansLineMatch[2].trim();
        }
        continue;
      }

      // Check for explanation lines
      const expLineMatch = rawLine.match(/^(?:Explanation|Remark|Note)\s*[:\-]\s*(.+)/i);
      if (expLineMatch) {
        explanation = expLineMatch[1].trim();
        continue;
      }

      // 2. Check for Option lines: e.g. "A) ...", "A. ...", "(A) ...", "[x] A)", "*A) ...*"
      // Also detects if the option itself has an asterisk (*A* or *A)* or is marked as correct
      const isAsteriskMarked =
        /^\*[A-D][\.\)]/i.test(rawLine) ||
        /\*[A-D]\b/i.test(rawLine) ||
        rawLine.endsWith("*") ||
        /\(correct\)/i.test(rawLine) ||
        /\[correct\]/i.test(rawLine) ||
        /\[x\]/i.test(rawLine) ||
        /✓/i.test(rawLine);

      // Clean checkmarks and markers
      const cleanLine = rawLine
        .replace(/^\[[x\s]\]\s*/i, "")
        .replace(/^✓\s*/, "")
        .trim();

      const optionMatch = cleanLine.match(
        /^\*?\(?([A-D])\)?[.\-\)]\s*(.+)/i
      );

      if (optionMatch) {
        parsingOptions = true;
        const optLetter = optionMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
        let optText = optionMatch[2].replace(/\*+/g, "").trim();

        // Check if option text has inline (Correct) or [x]
        if (/\((?:correct|true|right|ans)\)/i.test(optText) || /\[(?:correct|true|right|ans)\]/i.test(optText)) {
          detectedAnswer = optLetter;
          detectionMethod = `Marked with (Correct) tag on option ${optLetter}`;
          optText = optText.replace(/\s*\((?:correct|true|right|ans)\)/i, "").replace(/\s*\[(?:correct|true|right|ans)\]/i, "").trim();
        } else if (isAsteriskMarked && !detectedAnswer) {
          detectedAnswer = optLetter;
          detectionMethod = `Asterisk/Checkmark marker on option ${optLetter}`;
        }

        options[optLetter] = optText;
        continue;
      }

      // 3. Check for multi-option inline line e.g. "A) apple  B) banana  C) cherry  D) date"
      const inlineOptionsMatch = rawLine.match(
        /\(?[A]\)?[.\-]?\s+(.+?)\s+\(?[B]\)?[.\-]?\s+(.+?)\s+\(?[C]\)?[.\-]?\s+(.+?)\s+\(?[D]\)?[.\-]?\s+(.+)/i
      );
      if (inlineOptionsMatch) {
        parsingOptions = true;
        options.A = inlineOptionsMatch[1].trim();
        options.B = inlineOptionsMatch[2].trim();
        options.C = inlineOptionsMatch[3].trim();
        options.D = inlineOptionsMatch[4].trim();
        continue;
      }

      // If we haven't reached options, it's question text
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
        if (/^(?:Ans|Answer)\b/i.test(rawLine)) {
          const matchLetter = rawLine.match(/\b([A-D])\b/i);
          if (matchLetter) {
            detectedAnswer = matchLetter[1].toUpperCase() as "A" | "B" | "C" | "D";
            detectionMethod = `Answer tag "${rawLine}"`;
          }
        }
      }
    }

    questionText = questionTextLines.join(" ").trim();

    // If options are missing, attempt fallback extraction from question text if inline
    if (!options.A && !options.B) {
      const inlineMatch = questionText.match(
        /^(.*?)\s+A[\)\.]\s+(.+?)\s+B[\)\.]\s+(.+?)\s+C[\)\.]\s+(.+?)\s+D[\)\.]\s+(.+)$/i
      );
      if (inlineMatch) {
        questionText = inlineMatch[1].trim();
        options.A = inlineMatch[2].trim();
        options.B = inlineMatch[3].trim();
        options.C = inlineMatch[4].trim();
        options.D = inlineMatch[5].trim();
      }
    }

    if (!options.A) qWarnings.push("Option A is missing.");
    if (!options.B) qWarnings.push("Option B is missing.");
    if (!options.C) qWarnings.push("Option C is missing.");
    if (!options.D) qWarnings.push("Option D is missing.");

    if (!detectedAnswer) {
      for (const optKey of ["A", "B", "C", "D"] as const) {
        if (options[optKey].includes("*")) {
          detectedAnswer = optKey;
          detectionMethod = `Asterisk marker inside option ${optKey}`;
          options[optKey] = options[optKey].replace(/\*/g, "").trim();
          break;
        }
      }
    }

    if (!detectedAnswer) {
      detectedAnswer = "A";
      detectionMethod = "Unspecified in text (Defaulted to A - Please verify)";
      unresolvedCount++;
      qWarnings.push(
        "No explicit answer detected. Defaulted to Option A; please click the correct option to confirm."
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
