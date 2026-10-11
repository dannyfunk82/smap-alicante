import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/verify-backup.mjs <backup.json>");
const filepath = path.resolve(input);
const payload = await fs.readFile(filepath, "utf8");
const backup = JSON.parse(payload);
if (backup.format !== "smap-json-backup-v1" || !backup.tables || typeof backup.tables !== "object") {
  throw new Error("Invalid SMAP backup format");
}
const actual = crypto.createHash("sha256").update(payload).digest("hex");
let expected = null;
try { expected = (await fs.readFile(`${filepath}.sha256`, "utf8")).trim().split(/\s+/)[0]; } catch {}
if (expected && expected !== actual) throw new Error(`Checksum mismatch: expected ${expected}, got ${actual}`);
console.log(`Backup valid: ${path.basename(filepath)}`);
console.log(`Version: ${backup.version}; created: ${backup.createdAt}`);
console.log(`Tables: ${Object.keys(backup.tables).length}; SHA-256: ${actual}`);
