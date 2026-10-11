export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
export const MAX_IP_ATTEMPTS = 20;
export const RATE_WINDOW_MINUTES = 15;

export function validatePassword(password) {
  const errors = [];
  if (typeof password !== "string" || password.length < 10) errors.push("length");
  if (!/[a-z]/.test(password)) errors.push("lowercase");
  if (!/[A-Z]/.test(password)) errors.push("uppercase");
  if (!/[0-9]/.test(password)) errors.push("number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("symbol");
  return { valid: errors.length === 0, errors };
}

export function shouldLockAccount(failedAttempts) {
  return Number(failedAttempts) >= MAX_FAILED_LOGINS;
}

export function lockUntil(now = new Date()) {
  return new Date(now.getTime() + LOCK_MINUTES * 60_000);
}

export function remainingLockMinutes(lockedUntil, now = new Date()) {
  if (!lockedUntil) return 0;
  const milliseconds = new Date(lockedUntil).getTime() - now.getTime();
  return Math.max(0, Math.ceil(milliseconds / 60_000));
}
