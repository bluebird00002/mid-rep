/**
 * Username Validation Utilities
 * Production-grade username validation with TikTok-inspired rules
 */

// ============================================
// Constants
// ============================================
export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 24;

// ============================================
// Format Validation (Client-side)
// Mirrors backend validation rules
// ============================================
export const validateUsernameFormat = (username) => {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required" };
  }

  const trimmed = username.trim();

  // Length validation (4-24 characters)
  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return { valid: false, error: "Username must be at least 4 characters." };
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return { valid: false, error: "Username must be at most 24 characters." };
  }

  // Format validation (only lowercase letters, numbers, underscore, period)
  const formatRegex = /^[a-z0-9_.-]+$/;
  if (!formatRegex.test(trimmed)) {
    return {
      valid: false,
      error:
        "Username can only contain lowercase letters, numbers, periods, underscores, and hyphens.",
    };
  }

  // No spaces allowed
  if (username.includes(" ")) {
    return {
      valid: false,
      error: "Username cannot contain spaces.",
    };
  }

  // Cannot start or end with period
  if (trimmed.startsWith(".") || trimmed.endsWith(".")) {
    return {
      valid: false,
      error: "Username cannot start or end with a period.",
    };
  }

  // No consecutive periods
  if (trimmed.includes("..")) {
    return {
      valid: false,
      error: "Username cannot contain consecutive periods.",
    };
  }

  // Must contain at least one letter
  const hasLetter = /[a-z]/.test(trimmed);
  if (!hasLetter) {
    return {
      valid: false,
      error: "Username must contain at least one letter.",
    };
  }

  return { valid: true, error: null };
};

// ============================================
// Username Suggestion Generator
// Generates unique mid-xxxxxx style usernames
// ============================================
export const generateUsernameSuggestion = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const length = Math.floor(Math.random() * 5) + 4; // 4-8 characters
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // use underscore separator (allowed character) instead of hyphen
  return `mid_${result}`;
};

// ============================================
// ============================================
// Normalize username (lowercase + trim)
// ============================================
export const normalizeUsername = (username) => {
  if (!username) return "";
  return username.toLowerCase().trim();
};
