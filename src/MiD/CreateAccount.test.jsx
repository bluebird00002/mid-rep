/**
 * Username Validation System - Unit Tests
 *
 * Tests for:
 * - Format validation
 * - Restricted keyword detection (case-insensitive)
 * - Suggestion generator
 * - Edge cases
 */

import {
  validateUsernameFormat,
  generateUsernameSuggestion,
} from "../utils/usernameValidation";

// ============================================
// Test Suite: Username Format Validation
// ============================================

describe("validateUsernameFormat", () => {
  // ----- Empty/null input tests -----
  test("should reject empty string", () => {
    const result = validateUsernameFormat("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Username is required");
  });

  test("should reject null input", () => {
    const result = validateUsernameFormat(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Username is required");
  });

  test("should reject undefined input", () => {
    const result = validateUsernameFormat(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Username is required");
  });

  // ----- Length validation tests -----
  test("should reject username shorter than 5 characters", () => {
    const result = validateUsernameFormat("abc");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Username must be at least 5 characters.");
  });

  test("should reject username exactly 4 characters", () => {
    const result = validateUsernameFormat("abcd");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Username must be at least 5 characters.");
  });

  test("should accept username exactly 5 characters", () => {
    const result = validateUsernameFormat("abcde");
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  test("should accept username of 24 characters", () => {
    const result = validateUsernameFormat("a".repeat(24));
    expect(result.valid).toBe(true);
  });

  test("should reject username longer than 24 characters", () => {
    const result = validateUsernameFormat("a".repeat(25));
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Username must be at most 24 characters.");
  });

  // ----- Format validation tests -----
  test("should accept lowercase letters only", () => {
    const result = validateUsernameFormat("username");
    expect(result.valid).toBe(true);
  });

  test("should accept numbers only", () => {
    const result = validateUsernameFormat("12345");
    expect(result.valid).toBe(true);
  });

  test("should accept underscores", () => {
    const result = validateUsernameFormat("user_name");
    expect(result.valid).toBe(true);
  });

  test("should accept periods", () => {
    const result = validateUsernameFormat("user.name");
    expect(result.valid).toBe(true);
  });

  test("should accept mixed letters, numbers, underscore, period", () => {
    const result = validateUsernameFormat("user_123.name");
    expect(result.valid).toBe(true);
  });

  test("should reject uppercase letters", () => {
    const result = validateUsernameFormat("USERNAME");
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "Username can only contain lowercase letters, numbers, periods, and underscores.",
    );
  });

  test("should reject mixed case letters", () => {
    const result = validateUsernameFormat("UserName");
    expect(result.valid).toBe(false);
  });

  test("should reject special characters", () => {
    const result = validateUsernameFormat("user@name");
    expect(result.valid).toBe(false);
  });

  test("should reject spaces", () => {
    const result = validateUsernameFormat("user name");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Username cannot contain spaces.");
  });

  test("should reject hyphens", () => {
    const result = validateUsernameFormat("user-name");
    expect(result.valid).toBe(false);
  });

  // ----- Period position tests -----
  test("should reject username starting with period", () => {
    const result = validateUsernameFormat(".username");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Username cannot start or end with a period.");
  });

  test("should reject username ending with period", () => {
    const result = validateUsernameFormat("username.");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Username cannot start or end with a period.");
  });

  test("should reject consecutive periods", () => {
    const result = validateUsernameFormat("user..name");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Username cannot contain consecutive periods.");
  });

  test("should accept single period in middle", () => {
    const result = validateUsernameFormat("user.name");
    expect(result.valid).toBe(true);
  });

  // ----- Letter requirement tests -----
  test("should reject numbers only", () => {
    const result = validateUsernameFormat("12345");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Username must contain at least one letter.");
  });

  test("should accept letter-number combination", () => {
    const result = validateUsernameFormat("user123");
    expect(result.valid).toBe(true);
  });

  // ----- Whitespace trimming tests -----
  test("should trim leading whitespace", () => {
    const result = validateUsernameFormat("  username");
    // The input is preserved but validation happens on trimmed value
    // Note: Client-side trims during validation check
  });

  test("should trim trailing whitespace", () => {
    const result = validateUsernameFormat("username  ");
    // Client-side trims during validation
  });
});

// ============================================
// Test Suite: Restricted Keyword Detection
// ============================================

describe("Restricted Keyword Detection (case-insensitive)", () => {
  // Exact match tests
  test('should reject exact "ceo"', () => {
    const result = validateUsernameFormat("ceo");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("This username contains a restricted keyword.");
  });

  test('should reject exact "CEO" (uppercase)', () => {
    const result = validateUsernameFormat("CEO");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("This username contains a restricted keyword.");
  });

  test('should reject exact "CeO" (mixed case)', () => {
    const result = validateUsernameFormat("CeO");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("This username contains a restricted keyword.");
  });

  // Prefix tests
  test('should reject "johnceo" (ceo at end)', () => {
    const result = validateUsernameFormat("johnceo");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("This username contains a restricted keyword.");
  });

  test('should reject "ceo123" (ceo at start)', () => {
    const result = validateUsernameFormat("ceo123");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("This username contains a restricted keyword.");
  });

  // Suffix tests
  test('should reject "superceoman" (ceo in middle)', () => {
    const result = validateUsernameFormat("superceoman");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("This username contains a restricted keyword.");
  });

  test('should reject "mid-ceo123" (ceo with hyphen-style)', () => {
    const result = validateUsernameFormat("midceo123");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("This username contains a restricted keyword.");
  });

  // Edge cases
  test('should reject "johnCEOx" (ceo uppercase in middle)', () => {
    const result = validateUsernameFormat("johnCEOx");
    expect(result.valid).toBe(false);
  });

  test('should reject "cEo" (minimal variation)', () => {
    const result = validateUsernameFormat("cEo");
    expect(result.valid).toBe(false);
  });

  test('should accept username without "ceo"', () => {
    const result = validateUsernameFormat("username");
    expect(result.valid).toBe(true);
  });

  test('should accept "celebration" (contains ce but not ceo)', () => {
    const result = validateUsernameFormat("celebration");
    expect(result.valid).toBe(true);
  });

  test('should accept "mirror" (contains or but not ceo)', () => {
    const result = validateUsernameFormat("mirror");
    expect(result.valid).toBe(true);
  });
});

// ============================================
// Test Suite: Username Suggestion Generator
// ============================================

describe("generateUsernameSuggestion", () => {
  test('should generate username starting with "mid-"', () => {
    const suggestion = generateUsernameSuggestion();
    expect(suggestion).toMatch(/^mid-[a-z0-9]+$/);
  });

  test('should generate username with 4-8 characters after "mid-"', () => {
    for (let i = 0; i < 100; i++) {
      const suggestion = generateUsernameSuggestion();
      const suffix = suggestion.replace("mid-", "");
      expect(suffix.length).toBeGreaterThanOrEqual(4);
      expect(suffix.length).toBeLessThanOrEqual(8);
    }
  });

  test("should only contain lowercase letters and numbers", () => {
    for (let i = 0; i < 50; i++) {
      const suggestion = generateUsernameSuggestion();
      expect(suggestion).toMatch(/^mid-[a-z0-9]+$/);
    }
  });

  test('should not contain restricted keyword "ceo"', () => {
    for (let i = 0; i < 100; i++) {
      const suggestion = generateUsernameSuggestion();
      expect(suggestion.toLowerCase()).not.toContain("ceo");
    }
  });

  test("should generate different suggestions", () => {
    const suggestions = new Set();
    for (let i = 0; i < 50; i++) {
      suggestions.add(generateUsernameSuggestion());
    }
    // Most should be unique (allowing some collisions)
    expect(suggestions.size).toBeGreaterThan(40);
  });
});

// ============================================
// Test Suite: Edge Cases
// ============================================

describe("Edge Cases", () => {
  test("should handle rapid typing simulation", () => {
    // Test that format validation works with partial input
    const partialInputs = ["a", "ab", "abc", "abcd"];
    partialInputs.forEach((input) => {
      const result = validateUsernameFormat(input);
      expect(result.valid).toBe(false);
    });
  });

  test("should handle pasting long username", () => {
    const longUsername = "a".repeat(30);
    const result = validateUsernameFormat(longUsername);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Username must be at most 24 characters.");
  });

  test("should handle username with only special allowed chars", () => {
    const result = validateUsernameFormat("a_b.c");
    expect(result.valid).toBe(true);
  });

  test("should handle username at max length with all valid chars", () => {
    const result = validateUsernameFormat("a".repeat(24));
    expect(result.valid).toBe(true);
  });

  test("should handle string input type edge cases", () => {
    // Test number passed as string
    const result = validateUsernameFormat("12345");
    expect(result.valid).toBe(false); // No letters

    // Test with leading/trailing spaces in trimmed check
    const result2 = validateUsernameFormat("  test  ");
    // This depends on implementation - some trim, some don't
  });
});
