import test from "node:test";
import assert from "node:assert/strict";
import { lockUntil, remainingLockMinutes, shouldLockAccount, validatePassword } from "../lib/security.js";

test("strong password policy", () => {
  assert.equal(validatePassword("SmapDemo2026!").valid, true);
  assert.equal(validatePassword("short").valid, false);
  assert.deepEqual(validatePassword("abcdefghij").errors.sort(), ["number", "symbol", "uppercase"].sort());
});

test("account locks on fifth failure", () => {
  assert.equal(shouldLockAccount(4), false);
  assert.equal(shouldLockAccount(5), true);
});

test("lock window is fifteen minutes", () => {
  const now = new Date("2026-07-24T10:00:00Z");
  const until = lockUntil(now);
  assert.equal(until.toISOString(), "2026-07-24T10:15:00.000Z");
  assert.equal(remainingLockMinutes(until, now), 15);
});
