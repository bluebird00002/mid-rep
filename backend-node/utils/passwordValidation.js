export const PASSWORD_RULES = "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and symbol, with no spaces.";

export function validatePasswordStrength(password) {
  if (typeof password !== "string" || !password) return { valid: false, error: "Password is required." };
  if (password.length < 8) return { valid: false, error: PASSWORD_RULES };
  if (!/[a-z]/.test(password)) return { valid: false, error: PASSWORD_RULES };
  if (!/[A-Z]/.test(password)) return { valid: false, error: PASSWORD_RULES };
  if (!/\d/.test(password)) return { valid: false, error: PASSWORD_RULES };
  if (!/[^A-Za-z0-9\s]/.test(password)) return { valid: false, error: PASSWORD_RULES };
  if (/\s/.test(password)) return { valid: false, error: PASSWORD_RULES };
  return { valid: true, error: null };
}
