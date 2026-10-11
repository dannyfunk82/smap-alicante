import pg from "pg";
import crypto from "node:crypto";
import { approvalAllowsDeploy } from "../lib/go-live-policy.js";

const args = Object.fromEntries(process.argv.slice(2).map((entry) => { const [key, ...rest] = entry.replace(/^--/, "").split("="); return [key, rest.join("=") || true]; }));
const version = String(args.version || "1.0.0");
const environment = String(args.environment || process.env.SMAP_ENVIRONMENT || "local");
if (!["local", "staging", "production"].includes(environment)) throw new Error("environment must be local, staging or production");
const deploymentId = String(args.deploymentId || process.env.NEXT_DEPLOYMENT_ID || `${environment}-${version}-${crypto.randomBytes(4).toString("hex")}`);
const status = String(args.status || "prepared");
if (!["prepared", "deployed", "rolled_back", "failed"].includes(status)) throw new Error("Invalid release status");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  if (environment === "production" && status === "deployed" && args.force !== true) {
    const approval = await client.query("SELECT decision FROM release_approvals WHERE release_version=$1 AND environment='production' ORDER BY decided_at DESC LIMIT 1", [version]);
    if (!approvalAllowsDeploy(approval.rows[0]?.decision)) throw new Error(`Production release ${version} requires an approved or conditional release approval`);
  }
  const result = await client.query(`INSERT INTO deployment_releases(version,deployment_id,environment,status,commit_ref,notes,deployed_at)
    VALUES($1,$2,$3,$4,$5,$6,CASE WHEN $4='deployed' THEN NOW() ELSE NULL END)
    ON CONFLICT(deployment_id) DO UPDATE SET status=EXCLUDED.status,commit_ref=EXCLUDED.commit_ref,notes=EXCLUDED.notes,deployed_at=CASE WHEN EXCLUDED.status='deployed' THEN NOW() ELSE deployment_releases.deployed_at END RETURNING id`,
    [version, deploymentId, environment, status, args.commit || null, args.notes || null]);
  console.log(JSON.stringify({ ok: true, id: Number(result.rows[0].id), version, deploymentId, environment, status }, null, 2));
} finally { await client.end(); }
