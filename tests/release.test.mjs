import test from "node:test";
import assert from "node:assert/strict";
import { aggregateHealth, deploymentReady, maintenanceState } from "../lib/release-policy.js";

test("health aggregation uses the most severe result", () => {
  assert.equal(aggregateHealth([{ status: "ok" }, { status: "warning" }]), "warning");
  assert.equal(aggregateHealth([{ status: "ok" }, { status: "error" }]), "error");
});

test("deployment readiness requires database and strong secrets", () => {
  assert.equal(deploymentReady({ database: "connected", environment: "production", authSecretLength: 40, integrationKeyLength: 20, forceHttps: true }).ready, true);
  assert.deepEqual(deploymentReady({ database: "unavailable", environment: "local", authSecretLength: 10, integrationKeyLength: 5, forceHttps: false }).failures, ["database", "auth_secret", "integration_key"]);
});

test("maintenance takes precedence over incident degradation", () => {
  assert.equal(maintenanceState(true, 2), "maintenance");
  assert.equal(maintenanceState(false, 1), "degraded");
  assert.equal(maintenanceState(false, 0), "operational");
});
