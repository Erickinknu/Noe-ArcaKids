import { buildPairingLink } from './pairing-link';

describe('buildPairingLink', () => {
  it('builds an arcakids deep link with the pairing code', () => {
    expect(buildPairingLink('ABC123')).toBe('arcakids://pair?code=ABC123');
  });

  it('includes familyId when provided', () => {
    const link = buildPairingLink('ABC123', '00000000-0000-0000-0000-000000000001');
    expect(link).toBe('arcakids://pair?code=ABC123&familyId=00000000-0000-0000-0000-000000000001');
  });

  it('omits familyId when null or undefined', () => {
    expect(buildPairingLink('ABC123', null)).toBe('arcakids://pair?code=ABC123');
    expect(buildPairingLink('ABC123', undefined)).toBe('arcakids://pair?code=ABC123');
  });

  it('URL-encodes the code', () => {
    expect(buildPairingLink('A B/C')).toBe('arcakids://pair?code=A%20B%2FC');
  });
});