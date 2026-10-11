import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { integritySeverity, maintenanceStatus, redactSecret, safeSupportBundleName } from "../lib/maintenance-policy.js";

test("maintenance status uses the most severe check",()=>{
  assert.equal(maintenanceStatus([{status:"ok"},{status:"warning"}]),"warning");
  assert.equal(maintenanceStatus([{status:"warning"},{status:"error"}]),"error");
});

test("sensitive values are redacted",()=>{
  const redacted=redactSecret("postgresql://smap:secret-password@localhost:5432/smap");
  assert.doesNotMatch(redacted,/secret-password/);
  assert.match(redacted,/\*\*\*/);
  assert.equal(redactSecret(""),"<not-set>");
});

test("integrity findings produce a summary",()=>{
  assert.deepEqual(integritySeverity([{severity:"warning"},{severity:"error"}]),{status:"error",critical:1,warnings:1,total:2});
  assert.equal(integritySeverity([]).status,"ok");
});

test("maintenance pack contains diagnosis, repair and safe update scripts",()=>{
  for(const file of ["windows/Diagnose-SMAP.ps1","windows/Repair-SMAP.ps1","windows/Update-SMAP.ps1","scripts/data-integrity.mjs","scripts/maintenance-report.mjs","docs/LONG_TERM_MAINTENANCE.md"]){
    assert.equal(fs.existsSync(file),true,`Missing ${file}`);
  }
  assert.match(safeSupportBundleName(new Date("2026-07-25T12:30:00Z")),/^SMAP-support-2026-07-25T12-30-00Z\.zip$/);
});
