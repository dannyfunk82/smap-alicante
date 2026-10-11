import test from "node:test";
import assert from "node:assert/strict";
import { chooseBusSource, telemetryFreshness } from "../lib/integration-policy.js";

const demo = [{ id: "D1", lineId: "L1", dataFreshness: "live" }, { id: "D2", lineId: "L2", dataFreshness: "live" }];
const external = [{ id: "E1", lineId: "L1", dataFreshness: "live" }];

test("external mode falls back when no fresh telemetry", () => {
  const result = chooseBusSource("external", true, demo, [{ id: "E0", lineId: "L1", dataFreshness: "stale" }]);
  assert.equal(result.active, "demo"); assert.equal(result.fallbackActive, true); assert.equal(result.buses.length, 2);
});

test("hybrid mode fills uncovered lines with demo buses", () => {
  const result = chooseBusSource("hybrid", true, demo, external);
  assert.equal(result.active, "mixed"); assert.deepEqual(result.buses.map((bus) => bus.id), ["E1", "D2"]);
});

test("telemetry freshness applies configured threshold", () => {
  const now = Date.parse("2026-07-24T12:00:45Z");
  assert.equal(telemetryFreshness("2026-07-24T12:00:10Z", 45, now), "live");
  assert.equal(telemetryFreshness("2026-07-24T11:59:00Z", 45, now), "stale");
});
