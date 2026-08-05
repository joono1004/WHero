// A shared SS/S/A/B/C/D grading scale, used wherever a stat is shown to the
// player as a letter grade instead of a raw number (chosen for
// accessibility - see docs/SYSTEM_LAYER.md task 3). CoreGrade is for stats
// every hero has some level of (leadership/force/intelligence/charisma).
// SpecialtyGrade adds "없음" for specialties a hero simply doesn't have.
export type CoreGrade = "SS" | "S" | "A" | "B" | "C" | "D";
export type SpecialtyGrade = CoreGrade | "없음";

const GRADE_ORDER: CoreGrade[] = ["D", "C", "B", "A", "S", "SS"];

export function gradeToScore(grade: CoreGrade): number {
  return GRADE_ORDER.indexOf(grade) + 1;
}

export function scoreToGrade(score: number): CoreGrade {
  const clamped = Math.min(GRADE_ORDER.length, Math.max(1, Math.round(score)));
  return GRADE_ORDER[clamped - 1];
}

export function averageGrade(grades: CoreGrade[]): CoreGrade {
  if (grades.length === 0) throw new Error("averageGrade requires at least one grade");
  const total = grades.reduce((sum, grade) => sum + gradeToScore(grade), 0);
  return scoreToGrade(total / grades.length);
}

// Draft pip costs to advance one grade, discussed but not yet locked down
// with the user - easy to retune, see docs/SYSTEM_LAYER.md. SS has no next
// grade. A->S and S->SS are meant to additionally require a rare item once
// that system exists (task 13/14 territory) - this table only covers the
// pip-gauge portion.
const PIPS_FOR_NEXT_GRADE: Record<Exclude<CoreGrade, "SS">, number> = {
  D: 5,
  C: 8,
  B: 12,
  A: 17,
  S: 23,
};

export function pipsRequiredForNextGrade(grade: CoreGrade): number | null {
  return grade === "SS" ? null : PIPS_FOR_NEXT_GRADE[grade];
}

export function nextGrade(grade: CoreGrade): CoreGrade | null {
  const index = GRADE_ORDER.indexOf(grade);
  return index === GRADE_ORDER.length - 1 ? null : GRADE_ORDER[index + 1];
}
