import { validateUsernameFormat, generateUsernameSuggestion, containsRestrictedKeyword } from "../utils/usernameValidation.js";

describe('Username validation utils', () => {
  test('rejects short and long names', () => {
    expect(validateUsernameFormat('a').valid).toBe(false);
    expect(validateUsernameFormat('ab').valid).toBe(false);
    const long = 'a'.repeat(30);
    expect(validateUsernameFormat(long).valid).toBe(false);
  });

  test('rejects invalid characters and spaces', () => {
    expect(validateUsernameFormat('john doe').valid).toBe(false);
    expect(validateUsernameFormat('john$doe').valid).toBe(false);
  });

  test('requires at least one letter', () => {
    expect(validateUsernameFormat('12345').valid).toBe(false);
    expect(validateUsernameFormat('user1').valid).toBe(true);
  });

  test('detects restricted keyword', () => {
    expect(containsRestrictedKeyword('ceo-user')).toBe(true);
    expect(validateUsernameFormat('ceobad')).toEqual(expect.objectContaining({ valid: false }));
  });

  test('suggestion format', () => {
    const s = generateUsernameSuggestion();
    expect(s.startsWith('mid-')).toBe(true);
    expect(s.length).toBeGreaterThanOrEqual(8);
  });
});
