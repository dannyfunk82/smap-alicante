import test from "node:test";
import assert from "node:assert/strict";
import { canTrackAnalytics, feedbackStatusTransition, normalizeRating, validFeedbackMessage } from "../lib/pilot-policy.js";

test("analytics requires consent and an allow-listed event", () => {
  assert.equal(canTrackAnalytics(true, "section_viewed"), true);
  assert.equal(canTrackAnalytics(false, "section_viewed"), false);
  assert.equal(canTrackAnalytics(true, "email_address_collected"), false);
});

test("feedback rating and message validation", () => {
  assert.equal(normalizeRating(7), 5);
  assert.equal(normalizeRating(2.4), 2);
  assert.equal(validFeedbackMessage("too short"), false);
  assert.equal(validFeedbackMessage("The accessible route information was clear."), true);
});

test("feedback workflow rejects arbitrary transitions", () => {
  assert.equal(feedbackStatusTransition("new", "reviewing"), true);
  assert.equal(feedbackStatusTransition("resolved", "new"), false);
  assert.equal(feedbackStatusTransition("closed", "reviewing"), true);
});
