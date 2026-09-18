import {
  ageFromBirthDate,
  ageGroupForAge,
  birthDateForAge,
  birthDateToAgeGroup,
  isValidBirthDate,
  parseBirthDate,
} from './child-age';

describe('parseBirthDate', () => {
  it('accepts a valid date-only string', () => {
    expect(parseBirthDate('2020-05-14')).toBe('2020-05-14');
  });

  it('rejects invalid dates', () => {
    expect(parseBirthDate('2020-13-01')).toBeNull();
    expect(parseBirthDate('2020-02-30')).toBeNull();
    expect(parseBirthDate('not-a-date')).toBeNull();
    expect(parseBirthDate('2020')).toBeNull();
  });
});

describe('isValidBirthDate', () => {
  it('accepts ages between 0 and 17', () => {
    expect(isValidBirthDate(birthDateForAge(8))).toBe(true);
    expect(isValidBirthDate(birthDateForAge(17))).toBe(true);
  });

  it('rejects future dates and adults', () => {
    expect(isValidBirthDate(birthDateForAge(-1))).toBe(false);
    expect(isValidBirthDate(birthDateForAge(18))).toBe(false);
  });
});

describe('ageFromBirthDate', () => {
  it('computes the age relative to today', () => {
    const today = new Date();
    const bd = `${today.getFullYear() - 10}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
    const age = ageFromBirthDate(bd);
    expect(age).toBe(10);
    expect(ageFromBirthDate('invalid')).toBeNull();
  });
});

describe('ageGroupForAge / birthDateToAgeGroup', () => {
  it('maps ages to groups', () => {
    expect(ageGroupForAge(3)).toBe('preschool');
    expect(ageGroupForAge(7)).toBe('kids');
    expect(ageGroupForAge(10)).toBe('preteen');
    expect(ageGroupForAge(15)).toBe('teen');
    expect(ageGroupForAge(null)).toBeNull();
    expect(ageGroupForAge(20)).toBeNull();
  });

  it('derives the group from a birth date', () => {
    expect(birthDateToAgeGroup(birthDateForAge(4))).toBe('preschool');
    expect(birthDateToAgeGroup(null)).toBeNull();
    expect(birthDateToAgeGroup('invalid')).toBeNull();
  });
});