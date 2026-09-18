export type AgeGroupKey = 'preschool' | 'kids' | 'preteen' | 'teen';

export interface AgeGroup {
  key: AgeGroupKey;
  labelEs: string;
  from: number;
  to: number;
}

export const AGE_GROUPS: AgeGroup[] = [
  { key: 'preschool', labelEs: 'Preescolar', from: 0, to: 5 },
  { key: 'kids', labelEs: 'Primaria', from: 6, to: 8 },
  { key: 'preteen', labelEs: 'Pre-adolescente', from: 9, to: 12 },
  { key: 'teen', labelEs: 'Adolescente', from: 13, to: 17 },
];

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseBirthDate(value: string): string | null {
  const trimmed = value.trim();
  if (!DATE_ONLY_RE.test(trimmed)) return null;
  const [y, m, d] = trimmed.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return trimmed;
}

export function isValidBirthDate(value: string): boolean {
  const parsed = parseBirthDate(value);
  if (!parsed) return false;
  const age = ageFromBirthDate(parsed);
  return age !== null && age >= 0 && age <= 17;
}

export function ageFromBirthDate(birthDate: string): number | null {
  const parsed = parseBirthDate(birthDate);
  if (!parsed) return null;
  const [y, m, d] = parsed.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age -= 1;
  return age;
}

export function ageGroupForAge(age: number | null): AgeGroupKey | null {
  if (age === null) return null;
  const group = AGE_GROUPS.find((g) => age >= g.from && age <= g.to);
  return group?.key ?? null;
}

export function birthDateToAgeGroup(birthDate: string | null): AgeGroupKey | null {
  return ageGroupForAge(birthDate ? ageFromBirthDate(birthDate) : null);
}

export function birthDateForAge(age: number): string {
  const today = new Date();
  return [
    today.getFullYear() - age,
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
}