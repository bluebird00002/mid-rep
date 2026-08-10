export const PASSWORD_RULES =
  "Use 8+ characters with an uppercase letter, lowercase letter, number, and symbol, with no spaces.";

export const validatePasswordStrength = (password) => {
  if (!password) return { valid: false, error: "Password is required" };
  if (
    password.length < 8 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9\s]/.test(password) ||
    /\s/.test(password)
  ) {
    return { valid: false, error: PASSWORD_RULES };
  }
  return { valid: true, error: null };
};
