// Server-side username validation utilities (mirror client rules)
export const USERNAME_MIN_LENGTH = 5;
export const USERNAME_MAX_LENGTH = 24;
export const RESTRICTED_KEYWORD = "ceo";

export function normalizeUsername(username) {
  if (!username || typeof username !== 'string') return '';
  return username.toLowerCase().trim();
}

export function validateUsernameFormat(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  const trimmed = username.trim();
  if (trimmed.length < USERNAME_MIN_LENGTH) return { valid: false, error: 'Username must be at least 5 characters.' };
  if (trimmed.length > USERNAME_MAX_LENGTH) return { valid: false, error: 'Username must be at most 24 characters.' };
  const formatRegex = /^[a-z0-9_.]+$/;
  if (!formatRegex.test(trimmed)) return { valid: false, error: 'Username can only contain lowercase letters, numbers, periods, and underscores.' };
  if (username.includes(' ')) return { valid: false, error: 'Username cannot contain spaces.' };
  if (trimmed.startsWith('.') || trimmed.endsWith('.')) return { valid: false, error: 'Username cannot start or end with a period.' };
  if (trimmed.includes('..')) return { valid: false, error: 'Username cannot contain consecutive periods.' };
  if (!/[a-z]/.test(trimmed)) return { valid: false, error: 'Username must contain at least one letter.' };
  if (trimmed.toLowerCase().includes(RESTRICTED_KEYWORD)) return { valid: false, error: 'This username contains a restricted keyword.' };
  return { valid: true, error: null };
}

export function generateUsernameSuggestion() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = Math.floor(Math.random() * 5) + 4; // 4-8 chars
  let result = '';
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return `mid-${result}`;
}

export function containsRestrictedKeyword(username) {
  if (!username) return false;
  return username.toLowerCase().includes(RESTRICTED_KEYWORD);
}
