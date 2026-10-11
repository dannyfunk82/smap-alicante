import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

test("Alicante GTFS migration contains schedule tables", () => {
  const migration = fs.readFileSync("database/019_alicante_real_gtfs.sql", "utf8");
  for (const table of ["gtfs_datasets", "gtfs_routes", "gtfs_stops", "gtfs_trips", "gtfs_stop_times", "gtfs_shapes"]) assert.match(migration, new RegExp(table));
});

test("Alicante importer validates the bundled sample without a database", () => {
  const result = spawnSync(process.execPath, ["scripts/import-alicante-gtfs.mjs", "--dir", "samples/gtfs_minimal", "--dryRun", "true"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.routes, 1);
  assert.ok(output.stops >= 2);
  assert.ok(output.stopTimes >= 2);
});

test("Windows real-data launcher and attribution are included", () => {
  assert.equal(fs.existsSync("windows/IMPORT_ALICANTE_GTFS.cmd"), true);
  assert.equal(fs.existsSync("windows/Import-Alicante-GTFS.ps1"), true);
  const importer = fs.readFileSync("scripts/import-alicante-gtfs.mjs", "utf8");
  assert.match(importer, /Powered by MITRAMS/);
});
