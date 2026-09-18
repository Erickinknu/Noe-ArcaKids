export const PAIRING_SCHEME = 'arcakids';

export function buildPairingLink(code: string, familyId?: string | null): string {
  const params = [`code=${encodeURIComponent(code)}`];
  if (familyId) params.push(`familyId=${encodeURIComponent(familyId)}`);
  return `${PAIRING_SCHEME}://pair?${params.join('&')}`;
}