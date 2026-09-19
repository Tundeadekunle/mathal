// Grading rules and remarks for Mathal International Schools

export interface GradeResult {
  grade: "A" | "B" | "C" | "D" | "E" | "F";
  remark: string;
  points: number;
}

export function computeGrade(total: number): GradeResult {
  const rounded = Math.round(total * 10) / 10;

  if (rounded >= 75) {
    return { grade: "A", remark: "Distinction / Excellent", points: 5 };
  } else if (rounded >= 65) {
    return { grade: "B", remark: "Very Good", points: 4 };
  } else if (rounded >= 50) {
    return { grade: "C", remark: "Credit / Good", points: 3 };
  } else if (rounded >= 45) {
    return { grade: "D", remark: "Pass / Fair", points: 2 };
  } else if (rounded >= 40) {
    return { grade: "E", remark: "Weak Pass", points: 1 };
  } else {
    return { grade: "F", remark: "Fail / Needs Improvement", points: 0 };
  }
}

export const AFFECTIVE_DOMAINS = [
  "Punctuality",
  "Neatness & Personal Hygiene",
  "Politeness & Courtesy",
  "Honesty & Reliability",
  "Relationship with Peers",
  "Self Control & Discipline",
  "Attentiveness in Class",
  "Spirit of Co-operation",
];

export const PSYCHOMOTOR_DOMAINS = [
  "Handwriting / Penmanship",
  "Verbal & Reading Fluency",
  "Sports & Physical Games",
  "Arts, Crafts & Creativity",
  "Musical / Cultural Skills",
  "Handling of Tools & Lab Apparatus",
];

export const RATING_SCALE = [
  { value: 5, label: "5 - Excellent" },
  { value: 4, label: "4 - Good" },
  { value: 3, label: "3 - Fair" },
  { value: 2, label: "2 - Poor" },
  { value: 1, label: "1 - Very Poor" },
];

export const PRIMARY_CLASSES = [
  "Nursery 1",
  "Nursery 2",
  "Nursery 3",
  "Basic 1",
  "Basic 2",
  "Basic 3",
  "Basic 4",
  "Basic 5",
  "Basic 6",
];

export const SECONDARY_CLASSES = [
  "JSS 1",
  "JSS 2",
  "JSS 3",
  "SSS 1 (Science)",
  "SSS 1 (Arts)",
  "SSS 1 (Commercial)",
  "SSS 2 (Science)",
  "SSS 2 (Arts)",
  "SSS 2 (Commercial)",
  "SSS 3 (Science)",
  "SSS 3 (Arts)",
  "SSS 3 (Commercial)",
];

export const ALL_CLASSES = [...PRIMARY_CLASSES, ...SECONDARY_CLASSES];

export const CLASS_ARMS = ["Gold", "Diamond", "Silver", "Emerald", "A", "B", "C"];
