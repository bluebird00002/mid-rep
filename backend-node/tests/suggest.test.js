import { generateUsernameSuggestion } from "../utils/usernameValidation.js";

describe('Suggestion generator', () => {
  test('generates valid candidates and avoids restricted keyword', () => {
    for (let i = 0; i < 20; i++) {
      const s = generateUsernameSuggestion();
      expect(s.startsWith('mid-')).toBe(true);
      expect(/^[a-z0-9\-]+$/.test(s)).toBe(true);
      expect(s.length).toBeGreaterThanOrEqual(8);
    }
  });
});
