import { buildInviteLink } from '@/features/family-invites/services/family-invite-service';

jest.mock('@noe-arcakids/shared', () => ({
  t: (key: string) => key,
  ValidationError: class extends Error {},
  DatabaseError: class extends Error {},
}));
jest.mock('@noe-arcakids/supabase', () => ({ requireSupabaseClient: jest.fn() }));

describe('buildInviteLink', () => {
  it('construye el deep link de unión con el código', () => {
    expect(buildInviteLink('8F2K9Q')).toBe('noe://join?code=8F2K9Q');
  });

  it('codifica caracteres especiales del código', () => {
    expect(buildInviteLink('a b')).toBe('noe://join?code=a%20b');
  });
});