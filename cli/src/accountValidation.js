export const USERNAME_RULES = "4-24 characters: lowercase letters, numbers, periods, underscores, or hyphens; include at least one letter";
export const PASSWORD_RULES = "8+ characters with at least one uppercase letter, lowercase letter, number, and symbol; no spaces";

export function validateAccountUsername(value) {
  if (typeof value !== "string" || !value.trim()) return { valid: false, error: "Username is required" };
  const username = value.trim().toLowerCase();
  if (username.length < 4) return { valid: false, error: "Username must be at least 4 characters" };
  if (username.length > 24) return { valid: false, error: "Username must be at most 24 characters" };
  if (/\s/.test(value)) return { valid: false, error: "Username cannot contain spaces" };
  if (!/^[a-z0-9_.-]+$/.test(username)) {
    return { valid: false, error: "Username may contain only lowercase letters, numbers, periods, underscores, and hyphens" };
  }
  if (username.startsWith(".") || username.endsWith(".")) {
    return { valid: false, error: "Username cannot start or end with a period" };
  }
  if (username.includes("..")) return { valid: false, error: "Username cannot contain consecutive periods" };
  if (!/[a-z]/.test(username)) return { valid: false, error: "Username must contain at least one letter" };
  return { valid: true, username };
}

export function validateAccountPassword(value) {
  if (typeof value !== "string" || !value) return { valid: false, error: "Password is required" };
  const missing = [];
  if (value.length < 8) missing.push("8 characters");
  if (!/[a-z]/.test(value)) missing.push("a lowercase letter");
  if (!/[A-Z]/.test(value)) missing.push("an uppercase letter");
  if (!/\d/.test(value)) missing.push("a number");
  if (!/[^A-Za-z0-9\s]/.test(value)) missing.push("a symbol");
  if (/\s/.test(value)) missing.push("no spaces");
  return missing.length
    ? { valid: false, error: `Password needs ${missing.join(", ")}` }
    : { valid: true };
}
