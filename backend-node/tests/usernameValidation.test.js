import { validateUsernameFormat, generateUsernameSuggestion } from "../utils/usernameValidation.js";

describe('Username validation utils', () => {
  test('rejects short and long names', () => {
    expect(validateUsernameFormat('a').valid).toBe(false);
    expect(validateUsernameFormat('ab').valid).toBe(false);
    const long = 'a'.repeat(30);
    expect(validateUsernameFormat(long).valid).toBe(false);
  });

  test('accepts a username containing exactly four characters', () => {
    expect(validateUsernameFormat('user').valid).toBe(true);
  });

  test('rejects invalid characters and spaces', () => {
    expect(validateUsernameFormat('john doe').valid).toBe(false);
    expect(validateUsernameFormat('john$doe').valid).toBe(false);
  });

  test('requires at least one letter', () => {
    expect(validateUsernameFormat('12345').valid).toBe(false);
    expect(validateUsernameFormat('user1').valid).toBe(true);
  });

  test('allows ceo text because privileges are role-based', () => {
    expect(validateUsernameFormat('ceo-user').valid).toBe(true);
  });

  test('suggestion format', () => {
    const s = generateUsernameSuggestion();
    expect(s.startsWith('mid-')).toBe(true);
    expect(s.length).toBeGreaterThanOrEqual(8);
  });
});
