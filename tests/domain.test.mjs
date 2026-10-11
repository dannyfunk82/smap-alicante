import test from "node:test";
import assert from "node:assert/strict";
import { clampPercentage, fareForStops, occupancyLevelForPercentage } from "../lib/domain.js";

test("fare bands and ticket multipliers", () => {
  assert.equal(fareForStops(5, "single"), 1.45);
  assert.equal(fareForStops(6, "single"), 1.90);
  assert.equal(fareForStops(11, "single"), 2.40);
  assert.equal(fareForStops(7, "return"), 3.42);
  assert.equal(fareForStops(7, "daily"), 5.70);
  assert.equal(fareForStops(0, "single"), 0);
});

test("occupancy thresholds are stable", () => {
  assert.equal(occupancyLevelForPercentage(0), "low");
  assert.equal(occupancyLevelForPercentage(39), "low");
  assert.equal(occupancyLevelForPercentage(40), "medium");
  assert.equal(occupancyLevelForPercentage(74), "medium");
  assert.equal(occupancyLevelForPercentage(75), "high");
  assert.equal(occupancyLevelForPercentage(100), "high");
});

test("percentage values are clamped", () => {
  assert.equal(clampPercentage(-5), 0);
  assert.equal(clampPercentage(41.6), 42);
  assert.equal(clampPercentage(108), 100);
});
