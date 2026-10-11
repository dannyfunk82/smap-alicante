import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const required = [
  "windows/Common.ps1",
  "windows/Install-SMAP.ps1",
  "windows/Initialize-PostgreSQL.ps1",
  "windows/Start-SMAP.ps1",
  "windows/Stop-SMAP.ps1",
  "windows/Status-SMAP.ps1",
  "windows/Backup-SMAP.ps1",
  "windows/SMAP-Control.ps1",
  "windows/SMAP_CONTROL.cmd",
  "windows/SETUP_AND_START_SMAP.cmd",
  "docs/WINDOWS_OPERATIONS.md",
  "UPGRADE_FROM_SPRINT16_WINDOWS.md",
];

test("Windows Operations Pack contains all launch and support files", () => {
  for (const file of required) assert.equal(fs.existsSync(file), true, `Missing ${file}`);
});

test("start and stop scripts manage runtime state and process tree", () => {
  const start = read("windows/Start-SMAP.ps1");
  const stop = read("windows/Stop-SMAP.ps1");
  assert.match(start, /Start-Process/);
  assert.match(start, /Wait-SmapReady/);
  assert.match(start, /PidFile/);
  assert.match(stop, /taskkill\.exe/);
  assert.match(stop, /\/T/);
});

test("installer applies migrations, seed and automated checks", () => {
  const installer = read("windows/Install-SMAP.ps1");
  assert.match(installer, /scripts\/migrate\.mjs/);
  assert.match(installer, /scripts\/seed\.mjs/);
  assert.match(installer, /npm\.cmd run check/);
});

test("PowerShell files avoid embedding the PostgreSQL administrator password", () => {
  for (const file of required.filter((file) => file.endsWith(".ps1"))) {
    const content = read(file);
    assert.doesNotMatch(content, /PostgresAdmin2026/i, `${file} contains an administrator password`);
  }
});
