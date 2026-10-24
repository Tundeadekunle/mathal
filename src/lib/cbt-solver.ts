// Intelligent Subject, Math, Science & Curriculum Question Solver for School CBT Exams

interface SolveResult {
  detectedAnswer: "A" | "B" | "C" | "D" | null;
  confidence: "high" | "medium" | "low";
  reason: string;
}

/**
 * Normalize string for comparison (removes punctuation, lowercases, trims)
 */
export function normalize(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s\/\.\+\-\%]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if a candidate option matches an expected answer value
 */
export function matchOptionValue(
  targetValue: string | number,
  options: { A: string; B: string; C: string; D: string }
): "A" | "B" | "C" | "D" | null {
  const targetStr = String(targetValue).trim().toLowerCase();
  const targetNum = parseFloat(targetStr);

  const letters: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];

  // 1. Exact or normalized string match
  for (const letter of letters) {
    const opt = options[letter].trim().toLowerCase();
    const cleanOpt = normalize(opt);
    const cleanTarget = normalize(targetStr);

    if (opt === targetStr || cleanOpt === cleanTarget) {
      return letter;
    }
  }

  // 2. Numeric equivalence match (e.g. 60 vs 60.0 or "60 items")
  if (!isNaN(targetNum)) {
    for (const letter of letters) {
      const opt = options[letter].trim();
      const numMatch = opt.match(/-?\d+(?:\.\d+)?/);
      if (numMatch) {
        const optNum = parseFloat(numMatch[0]);
        if (Math.abs(optNum - targetNum) < 0.0001) {
          return letter;
        }
      }
    }
  }

  // 3. Fraction equivalence (e.g. 1/2 vs 0.5 or 50%)
  if (targetStr.includes("/") || !isNaN(targetNum)) {
    let targetDecimal = NaN;
    if (targetStr.includes("/")) {
      const parts = targetStr.split("/");
      targetDecimal = parseFloat(parts[0]) / parseFloat(parts[1]);
    } else {
      targetDecimal = targetNum;
    }

    if (!isNaN(targetDecimal)) {
      for (const letter of letters) {
        const opt = options[letter].trim();
        if (opt.includes("/")) {
          const parts = opt.split("/");
          const optDecimal = parseFloat(parts[0]) / parseFloat(parts[1]);
          if (Math.abs(optDecimal - targetDecimal) < 0.001) {
            return letter;
          }
        }
      }
    }
  }

  // 4. Substring / Word match
  for (const letter of letters) {
    const opt = normalize(options[letter]);
    const cleanTarget = normalize(targetStr);
    if (cleanTarget.length >= 3 && opt.includes(cleanTarget)) {
      return letter;
    }
    if (opt.length >= 3 && cleanTarget.includes(opt)) {
      return letter;
    }
  }

  return null;
}

/**
 * Solve basic arithmetic in question text:
 * Examples:
 * - "What is 15 multiplied by 4?"
 * - "What is 15 x 4?"
 * - "Calculate 25 + 35"
 * - "What is 100 - 45?"
 * - "What is 72 divided by 8?"
 * - "What is the square of 9?"
 * - "What is the square root of 64?"
 */
function solveArithmeticQuestion(questionText: string): number | null {
  const cleanQ = questionText.toLowerCase().replace(/,/g, "");

  // Square root: "square root of 64"
  const sqrtMatch = cleanQ.match(/square\s+root\s+of\s+(\d+(?:\.\d+)?)/i);
  if (sqrtMatch) {
    const val = parseFloat(sqrtMatch[1]);
    return Math.sqrt(val);
  }

  // Square: "square of 9"
  const sqMatch = cleanQ.match(/square\s+of\s+(\d+(?:\.\d+)?)/i);
  if (sqMatch) {
    const val = parseFloat(sqMatch[1]);
    return val * val;
  }

  // Cube: "cube of 3"
  const cubeMatch = cleanQ.match(/cube\s+of\s+(\d+(?:\.\d+)?)/i);
  if (cubeMatch) {
    const val = parseFloat(cubeMatch[1]);
    return val * val * val;
  }

  // Percentage of number: "what is 20% of 150"
  const pctMatch = cleanQ.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/i);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    const total = parseFloat(pctMatch[2]);
    return (pct / 100) * total;
  }

  // Multiplication: "15 multiplied by 4" or "15 times 4" or "product of 15 and 4" or "15 x 4" or "15 * 4"
  const mulMatch1 = cleanQ.match(/(\d+(?:\.\d+)?)\s*(?:multiplied\s+by|times|\*|x)\s*(\d+(?:\.\d+)?)/i);
  if (mulMatch1) {
    return parseFloat(mulMatch1[1]) * parseFloat(mulMatch1[2]);
  }
  const mulMatch2 = cleanQ.match(/product\s+of\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)/i);
  if (mulMatch2) {
    return parseFloat(mulMatch2[1]) * parseFloat(mulMatch2[2]);
  }

  // Division: "72 divided by 8" or "72 / 8"
  const divMatch1 = cleanQ.match(/(\d+(?:\.\d+)?)\s*(?:divided\s+by|\/)\s*(\d+(?:\.\d+)?)/i);
  if (divMatch1) {
    const divisor = parseFloat(divMatch1[2]);
    if (divisor !== 0) return parseFloat(divMatch1[1]) / divisor;
  }

  // Addition: "25 plus 35" or "25 + 35" or "sum of 25 and 35"
  const addMatch1 = cleanQ.match(/(\d+(?:\.\d+)?)\s*(?:plus|\+)\s*(\d+(?:\.\d+)?)/i);
  if (addMatch1) {
    return parseFloat(addMatch1[1]) + parseFloat(addMatch1[2]);
  }
  const addMatch2 = cleanQ.match(/sum\s+of\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)/i);
  if (addMatch2) {
    return parseFloat(addMatch2[1]) + parseFloat(addMatch2[2]);
  }

  // Subtraction: "100 minus 45" or "100 - 45" or "difference between 100 and 45"
  const subMatch1 = cleanQ.match(/(\d+(?:\.\d+)?)\s*(?:minus|\-)\s*(\d+(?:\.\d+)?)/i);
  if (subMatch1) {
    return parseFloat(subMatch1[1]) - parseFloat(subMatch1[2]);
  }
  const subMatch2 = cleanQ.match(/difference\s+between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)/i);
  if (subMatch2) {
    return Math.abs(parseFloat(subMatch2[1]) - parseFloat(subMatch2[2]));
  }

  // Linear equation: "solve for x in 2x + 4 = 10" or "2x + 4 = 10"
  const eqMatch = cleanQ.match(/(\d+)?x\s*([\+\-])\s*(\d+)\s*=\s*(\d+)/i);
  if (eqMatch) {
    const coeff = eqMatch[1] ? parseFloat(eqMatch[1]) : 1;
    const sign = eqMatch[2];
    const c1 = parseFloat(eqMatch[3]);
    const c2 = parseFloat(eqMatch[4]);
    const right = sign === "+" ? c2 - c1 : c2 + c1;
    return right / coeff;
  }

  return null;
}

/**
 * Solve even/odd/prime questions:
 * E.g. "Which of the following is an even number?"
 */
function solveNumberPropertyQuestion(
  questionText: string,
  options: { A: string; B: string; C: string; D: string }
): "A" | "B" | "C" | "D" | null {
  const cleanQ = questionText.toLowerCase();

  const isPrime = (num: number): boolean => {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    for (let i = 5; i * i <= num; i += 6) {
      if (num % i === 0 || num % (i + 2) === 0) return false;
    }
    return true;
  };

  const letters: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];

  if (cleanQ.includes("even number")) {
    for (const letter of letters) {
      const numMatch = options[letter].match(/-?\d+/);
      if (numMatch) {
        const val = parseInt(numMatch[0], 10);
        if (val % 2 === 0) return letter;
      }
    }
  }

  if (cleanQ.includes("odd number")) {
    for (const letter of letters) {
      const numMatch = options[letter].match(/-?\d+/);
      if (numMatch) {
        const val = parseInt(numMatch[0], 10);
        if (Math.abs(val) % 2 === 1) return letter;
      }
    }
  }

  if (cleanQ.includes("prime number")) {
    for (const letter of letters) {
      const numMatch = options[letter].match(/\d+/);
      if (numMatch) {
        const val = parseInt(numMatch[0], 10);
        if (isPrime(val)) return letter;
      }
    }
  }

  return null;
}

/**
 * Knowledge Base for Standard Curriculum Questions
 */
interface KnowledgeFact {
  patterns: RegExp[];
  answers: string[];
  explanation?: string;
}

const CURRICULUM_KNOWLEDGE_BASE: KnowledgeFact[] = [
  // Science & Biology
  {
    patterns: [
      /(?:gas\s+(?:do\s+)?human\s+(?:beings?\s+)?inhale|we\s+breathe\s+in|inhale\s+to\s+stay\s+alive)/i,
    ],
    answers: ["Oxygen", "O2"],
    explanation: "Humans inhale oxygen from the air to support cellular respiration.",
  },
  {
    patterns: [
      /(?:gas\s+(?:do\s+)?human\s+(?:beings?\s+)?exhale|we\s+breathe\s+out|exhale\s+as\s+waste)/i,
    ],
    answers: ["Carbon Dioxide", "CO2"],
    explanation: "Carbon dioxide is produced by metabolism and exhaled through the lungs.",
  },
  {
    patterns: [
      /(?:gas\s+(?:used|absorbed)\s+by\s+plants\s+for\s+photosynthesis)/i,
    ],
    answers: ["Carbon Dioxide", "CO2"],
  },
  {
    patterns: [
      /(?:green\s+pigment\s+in\s+plants|makes\s+plant\s+leaves?\s+green)/i,
    ],
    answers: ["Chlorophyll"],
  },
  {
    patterns: [
      /(?:powerhouse\s+of\s+the\s+cell)/i,
    ],
    answers: ["Mitochondria", "Mitochondrion"],
  },
  {
    patterns: [
      /(?:organ\s+(?:that\s+)?pumps?\s+blood|pumps\s+blood\s+around\s+the\s+body)/i,
    ],
    answers: ["Heart"],
  },
  {
    patterns: [
      /(?:organ\s+(?:responsible\s+for|used\s+for)\s+breathing\s+in\s+humans|respiratory\s+organ)/i,
    ],
    answers: ["Lungs", "Lung"],
  },
  {
    patterns: [
      /(?:vector\s+(?:for|of)\s+malaria|transmits?\s+malaria)/i,
    ],
    answers: ["Female Anopheles mosquito", "Anopheles mosquito", "Mosquito"],
  },
  {
    patterns: [
      /(?:largest\s+organ\s+(?:in|of)\s+the\s+human\s+body)/i,
    ],
    answers: ["Skin"],
  },
  {
    patterns: [
      /(?:chemical\s+formula\s+(?:for|of)\s+water)/i,
    ],
    answers: ["H2O", "H₂O"],
  },
  {
    patterns: [
      /(?:chemical\s+formula\s+(?:for|of)\s+table\s+salt)/i,
    ],
    answers: ["NaCl", "Sodium Chloride"],
  },
  {
    patterns: [
      /(?:boiling\s+point\s+of\s+water)/i,
    ],
    answers: ["100°C", "100 degrees Celsius", "100 C", "100"],
  },
  {
    patterns: [
      /(?:freezing\s+point\s+of\s+water)/i,
    ],
    answers: ["0°C", "0 degrees Celsius", "0 C", "0"],
  },
  {
    patterns: [
      /(?:planet\s+closest\s+to\s+the\s+sun)/i,
    ],
    answers: ["Mercury"],
  },
  {
    patterns: [
      /(?:largest\s+planet\s+in\s+the\s+solar\s+system)/i,
    ],
    answers: ["Jupiter"],
  },
  {
    patterns: [
      /(?:planet\s+(?:known|referred\s+to)\s+as\s+the\s+red\s+planet)/i,
    ],
    answers: ["Mars"],
  },
  {
    patterns: [
      /(?:star\s+at\s+the\s+center\s+of\s+(?:our\s+)?solar\s+system)/i,
    ],
    answers: ["Sun", "The Sun"],
  },
  {
    patterns: [
      /(?:si\s+unit\s+of\s+force)/i,
    ],
    answers: ["Newton", "N"],
  },
  {
    patterns: [
      /(?:si\s+unit\s+of\s+mass)/i,
    ],
    answers: ["Kilogram", "kg"],
  },
  {
    patterns: [
      /(?:si\s+unit\s+of\s+(?:electric\s+)?current)/i,
    ],
    answers: ["Ampere", "A"],
  },

  // Geography & Social Studies (Nigerian & Global)
  {
    patterns: [
      /(?:capital\s+(?:city\s+)?of\s+nigeria)/i,
    ],
    answers: ["Abuja", "FCT Abuja"],
    explanation: "Abuja became the federal capital territory of Nigeria in December 1991.",
  },
  {
    patterns: [
      /(?:commercial\s+capital\s+of\s+nigeria|largest\s+city\s+in\s+nigeria)/i,
    ],
    answers: ["Lagos"],
  },
  {
    patterns: [
      /(?:currency\s+(?:used\s+in|of)\s+nigeria)/i,
    ],
    answers: ["Naira", "NGN"],
  },
  {
    patterns: [
      /(?:how\s+many\s+states\s+(?:are\s+there\s+)?in\s+nigeria|number\s+of\s+states\s+in\s+nigeria)/i,
    ],
    answers: ["36", "36 states"],
  },
  {
    patterns: [
      /(?:year\s+nigeria\s+gained\s+independence|nigerian\s+independence\s+year)/i,
    ],
    answers: ["1960", "October 1, 1960"],
  },
  {
    patterns: [
      /(?:largest\s+continent\s+(?:in\s+the\s+world|by\s+area))/i,
    ],
    answers: ["Asia"],
  },
  {
    patterns: [
      /(?:smallest\s+continent\s+(?:in\s+the\s+world|by\s+area))/i,
    ],
    answers: ["Australia", "Oceania"],
  },
  {
    patterns: [
      /(?:longest\s+river\s+in\s+(?:the\s+world|africa))/i,
    ],
    answers: ["River Nile", "Nile"],
  },
  {
    patterns: [
      /(?:river\s+niger\s+and\s+river\s+benue\s+meet\s+at|confluence\s+town\s+in\s+nigeria)/i,
    ],
    answers: ["Lokoja"],
  },

  // General Math & Time Facts
  {
    patterns: [
      /(?:days\s+in\s+a\s+leap\s+year|how\s+many\s+days\s+(?:are\s+in|make)\s+a\s+leap\s+year)/i,
    ],
    answers: ["366", "366 days"],
  },
  {
    patterns: [
      /(?:days\s+in\s+a\s+(?:normal\s+|regular\s+|standard\s+)?year)/i,
    ],
    answers: ["365", "365 days"],
  },
  {
    patterns: [
      /(?:fraction\s+representation\s+of\s+50%|50%\s+as\s+a\s+fraction)/i,
    ],
    answers: ["1/2"],
  },
  {
    patterns: [
      /(?:fraction\s+representation\s+of\s+25%|25%\s+as\s+a\s+fraction)/i,
    ],
    answers: ["1/4"],
  },
  {
    patterns: [
      /(?:fraction\s+representation\s+of\s+75%|75%\s+as\s+a\s+fraction)/i,
    ],
    answers: ["3/4"],
  },
  {
    patterns: [
      /(?:sum\s+of\s+angles\s+in\s+a\s+triangle|angles\s+in\s+a\s+triangle\s+add\s+up\s+to)/i,
    ],
    answers: ["180°", "180 degrees", "180"],
  },
  {
    patterns: [
      /(?:sum\s+of\s+angles\s+in\s+a\s+quadrilateral)/i,
    ],
    answers: ["360°", "360 degrees", "360"],
  },
  {
    patterns: [
      /(?:how\s+many\s+sides\s+(?:does\s+a|has\s+a)\s+pentagon)/i,
    ],
    answers: ["5", "5 sides"],
  },
  {
    patterns: [
      /(?:how\s+many\s+sides\s+(?:does\s+a|has\s+a)\s+hexagon)/i,
    ],
    answers: ["6", "6 sides"],
  },
  {
    patterns: [
      /(?:how\s+many\s+sides\s+(?:does\s+a|has\s+a)\s+octagon)/i,
    ],
    answers: ["8", "8 sides"],
  },

  // English & Grammar
  {
    patterns: [
      /(?:past\s+tense\s+of\s+['"]?go['"]?)/i,
    ],
    answers: ["went"],
  },
  {
    patterns: [
      /(?:past\s+tense\s+of\s+['"]?eat['"]?)/i,
    ],
    answers: ["ate"],
  },
  {
    patterns: [
      /(?:past\s+tense\s+of\s+['"]?buy['"]?)/i,
    ],
    answers: ["bought"],
  },
  {
    patterns: [
      /(?:past\s+tense\s+of\s+['"]?see['"]?)/i,
    ],
    answers: ["saw"],
  },
  {
    patterns: [
      /(?:past\s+tense\s+of\s+['"]?write['"]?)/i,
    ],
    answers: ["wrote"],
  },
  {
    patterns: [
      /(?:plural\s+(?:form\s+)?of\s+['"]?child['"]?)/i,
    ],
    answers: ["children"],
  },
  {
    patterns: [
      /(?:plural\s+(?:form\s+)?of\s+['"]?tooth['"]?)/i,
    ],
    answers: ["teeth"],
  },
  {
    patterns: [
      /(?:plural\s+(?:form\s+)?of\s+['"]?foot['"]?)/i,
    ],
    answers: ["feet"],
  },
  {
    patterns: [
      /(?:plural\s+(?:form\s+)?of\s+['"]?ox['"]?)/i,
    ],
    answers: ["oxen"],
  },
  {
    patterns: [
      /(?:plural\s+(?:form\s+)?of\s+['"]?mouse['"]?)/i,
    ],
    answers: ["mice"],
  },
  {
    patterns: [
      /(?:opposite\s+of\s+['"]?ancient['"]?|antonym\s+of\s+['"]?ancient['"]?)/i,
    ],
    answers: ["modern"],
  },
  {
    patterns: [
      /(?:opposite\s+of\s+['"]?happy['"]?|antonym\s+of\s+['"]?happy['"]?)/i,
    ],
    answers: ["sad", "unhappy"],
  },
];

/**
 * Main Solver function that attempts to solve any primary/secondary school question
 */
export function solveQuestion(
  questionText: string,
  options: { A: string; B: string; C: string; D: string }
): SolveResult {
  if (!questionText) {
    return { detectedAnswer: null, confidence: "low", reason: "Empty question text" };
  }

  // 1. Try Number properties (even, odd, prime)
  const propMatch = solveNumberPropertyQuestion(questionText, options);
  if (propMatch) {
    return {
      detectedAnswer: propMatch,
      confidence: "high",
      reason: `Evaluated number property in question; Option ${propMatch} matches criteria.`,
    };
  }

  // 2. Try Arithmetic computation
  const calcResult = solveArithmeticQuestion(questionText);
  if (calcResult !== null) {
    const matchedOption = matchOptionValue(calcResult, options);
    if (matchedOption) {
      return {
        detectedAnswer: matchedOption,
        confidence: "high",
        reason: `Calculated mathematical answer: ${calcResult} (Matches Option ${matchedOption})`,
      };
    }
  }

  // 3. Try Curriculum Knowledge Base
  for (const fact of CURRICULUM_KNOWLEDGE_BASE) {
    const matchesPattern = fact.patterns.some((pattern) => pattern.test(questionText));
    if (matchesPattern) {
      for (const ans of fact.answers) {
        const matchedOption = matchOptionValue(ans, options);
        if (matchedOption) {
          return {
            detectedAnswer: matchedOption,
            confidence: "high",
            reason: fact.explanation || `Fact-checked solution: "${ans}" (Matches Option ${matchedOption})`,
          };
        }
      }
    }
  }

  return {
    detectedAnswer: null,
    confidence: "low",
    reason: "No exact rule matched question content.",
  };
}
