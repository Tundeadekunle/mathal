/**
 * Option Extraction and Normalization Utility for CBT Questions
 * 
 * Ensures every question displays clean question text and fully individual
 * Option A, Option B, Option C, and Option D choices to students.
 */

export interface UnpackedQuestionOptions {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export function cleanOptionText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/^[\s\(\[\{\-–—\.]*(?:[A-Da-d])[\.\)\:\-\–—\]\}\s]+/i, "") // strip leading "A.", "(A)", "[A]", "A:"
    .replace(/\s+(?:Answer|Ans|Key)\s*[:\-].*$/i, "") // strip trailing "Answer: B"
    .trim();
}

export function isPlaceholderOption(val: string | null | undefined): boolean {
  if (!val) return true;
  const clean = val.trim().toLowerCase();
  return (
    clean === "option a" ||
    clean === "option b" ||
    clean === "option c" ||
    clean === "option d" ||
    clean === ""
  );
}

/**
 * Unpack any question object so that options lumped in optionA or embedded
 * inside questionText are cleanly isolated into optionA, optionB, optionC, and optionD.
 */
export function unpackQuestionOptions(q: {
  questionText?: string | null;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
}): UnpackedQuestionOptions {
  const text = (q.questionText || "").trim();
  const A = (q.optionA || "").trim();
  const B = (q.optionB || "").trim();
  const C = (q.optionC || "").trim();
  const D = (q.optionD || "").trim();

  // 1. Embedded 4 options in questionText: e.g. "Question stem... (a) ... (b) ... (c) ... (d) ..."
  const embedded4Match = text.match(
    /^([\s\S]*?)(?:[\s,;]+(?:(?:\(?a[\.\)]|\[a\]|\ba[\.\:]))\s+)([\s\S]*?)(?:[\s,;]+(?:(?:\(?b[\.\)]|\[b\]|\bb[\.\:]))\s+)([\s\S]*?)(?:[\s,;]+(?:(?:\(?c[\.\)]|\[c\]|\bc[\.\:]))\s+)([\s\S]*?)(?:[\s,;]+(?:(?:\(?d[\.\)]|\[d\]|\bd[\.\:]))\s+)([\s\S]*)$/i
  );
  if (
    embedded4Match &&
    isPlaceholderOption(A) &&
    isPlaceholderOption(B) &&
    isPlaceholderOption(C) &&
    isPlaceholderOption(D)
  ) {
    return {
      questionText: embedded4Match[1].trim(),
      optionA: cleanOptionText(embedded4Match[2]),
      optionB: cleanOptionText(embedded4Match[3]),
      optionC: cleanOptionText(embedded4Match[4]),
      optionD: cleanOptionText(embedded4Match[5]),
    };
  }

  // 2. Embedded 3 options in text and 4th in D:
  const embedded3Match = text.match(
    /^([\s\S]*?)(?:[\s,;]+(?:(?:\(?a[\.\)]|\[a\]|\ba[\.\:]))\s+)([\s\S]*?)(?:[\s,;]+(?:(?:\(?b[\.\)]|\[b\]|\bb[\.\:]))\s+)([\s\S]*?)(?:[\s,;]+(?:(?:\(?c[\.\)]|\[c\]|\bc[\.\:]))\s+)([\s\S]*)$/i
  );
  if (
    embedded3Match &&
    isPlaceholderOption(A) &&
    isPlaceholderOption(B) &&
    isPlaceholderOption(C) &&
    !isPlaceholderOption(D)
  ) {
    return {
      questionText: embedded3Match[1].trim(),
      optionA: cleanOptionText(embedded3Match[2]),
      optionB: cleanOptionText(embedded3Match[3]),
      optionC: cleanOptionText(embedded3Match[4]),
      optionD: cleanOptionText(D),
    };
  }

  // 3. Options lumped in Option A: e.g. "Independence B. Civil war C. Democracy D. Election"
  if (isPlaceholderOption(B) && isPlaceholderOption(C) && isPlaceholderOption(D)) {
    // 3a. 4 options in A
    const lumped4 = A.match(
      /^([\s\S]*?)(?:\s+(?:B[\.\:\)]|\[B\]|\(B\)|\bb[\.\:\)]|\bB\s*-)\s+)([\s\S]*?)(?:\s+(?:C[\.\:\)]|\[C\]|\(C\)|\bc[\.\:\)]|\bC\s*-)\s+)([\s\S]*?)(?:\s+(?:D[\.\:\)]|\[D\]|\(D\)|\bd[\.\:\)]|\bD\s*-)\s*)([\s\S]*)$/i
    );
    if (lumped4) {
      let optD = cleanOptionText(lumped4[4]);
      if (!optD) optD = "None of the above";
      return {
        questionText: text,
        optionA: cleanOptionText(lumped4[1]),
        optionB: cleanOptionText(lumped4[2]),
        optionC: cleanOptionText(lumped4[3]),
        optionD: optD,
      };
    }

    // 3b. 3 options in A: e.g. "rise (b) rose (c) rises"
    const lumped3 = A.match(
      /^([\s\S]*?)(?:\s+(?:B[\.\:\)]|\[B\]|\(B\)|\bb[\.\:\)]|\bB\s*-)\s+)([\s\S]*?)(?:\s+(?:C[\.\:\)]|\[C\]|\(C\)|\bc[\.\:\)]|\bC\s*-)\s+)([\s\S]*)$/i
    );
    if (lumped3) {
      return {
        questionText: text,
        optionA: cleanOptionText(lumped3[1]),
        optionB: cleanOptionText(lumped3[2]),
        optionC: cleanOptionText(lumped3[3]),
        optionD: "None of the above",
      };
    }
  }

  // 4. Two options in A, 3rd in C (e.g. Basic Science Q19/Q26)
  if (isPlaceholderOption(B) && !isPlaceholderOption(C) && isPlaceholderOption(D)) {
    const lumpedAC = (A + " " + C).match(
      /^([\s\S]*?)(?:\s+(?:B[\.\:\)]|\[B\]|\(B\)|\bb[\.\:\)]|\bB\s*-)\s+)([\s\S]*?)(?:\s+(?:C[\.\:\)]|\[C\]|\(C\)|\bc[\.\:\)]|\bC\s*-)\s+)([\s\S]*?)(?:\s+(?:D[\.\:\)]|\[D\]|\(D\)|\bd[\.\:\)]|\bD\s*-)\s*)([\s\S]*)$/i
    );
    if (lumpedAC) {
      return {
        questionText: text,
        optionA: cleanOptionText(lumpedAC[1]),
        optionB: cleanOptionText(lumpedAC[2]),
        optionC: cleanOptionText(lumpedAC[3]),
        optionD: cleanOptionText(lumpedAC[4]) || "None of the above",
      };
    }
  }

  // 5. Three options in A, 4th in D:
  if (isPlaceholderOption(B) && isPlaceholderOption(C) && !isPlaceholderOption(D)) {
    const lumped3D = A.match(
      /^([\s\S]*?)(?:\s+(?:B[\.\:\)]|\[B\]|\(B\)|\bb[\.\:\)]|\bB\s*-)\s+)([\s\S]*?)(?:\s+(?:C[\.\:\)]|\[C\]|\(C\)|\bc[\.\:\)]|\bC\s*-)\s+)([\s\S]*)$/i
    );
    if (lumped3D) {
      return {
        questionText: text,
        optionA: cleanOptionText(lumped3D[1]),
        optionB: cleanOptionText(lumped3D[2]),
        optionC: cleanOptionText(lumped3D[3]),
        optionD: cleanOptionText(D),
      };
    }
  }

  // 6. Already cleanly separated options
  return {
    questionText: text,
    optionA: cleanOptionText(A),
    optionB: cleanOptionText(B),
    optionC: cleanOptionText(C),
    optionD: cleanOptionText(D),
  };
}
