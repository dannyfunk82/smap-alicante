import fs from "node:fs/promises";
import path from "node:path";
const args = Object.fromEntries(process.argv.slice(2).map((item, index, all) => item.startsWith("--") ? [item.slice(2), all[index + 1]?.startsWith("--") ? "true" : all[index + 1]] : null).filter(Boolean));
const dir = path.resolve(args.dir ?? "");
const sourceCode = String(args.source ?? "avanza").trim().toLowerCase();
const sourceName = String(args.name ?? "AVANZA GTFS").trim();
const maxRoutes = Math.max(1, Math.min(50, Number(args.maxRoutes ?? 3)));
const selectedRoutes = String(args.routes ?? "").split(",").map((value) => value.trim()).filter(Boolean);
if (!args.dir) throw new Error("Usage: npm run gtfs:import -- --dir C:\\path\\gtfs --source avanza [--routes 01,02,03]");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ""; }
    else if (char === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const headers = rows.shift()?.map((value) => value.trim()) ?? [];
  return rows.filter((values) => values.some((value) => value !== "")).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

async function readGtfs(name, required = true) {
  try { return parseCsv(await fs.readFile(path.join(dir, name), "utf8")); }
  catch (error) { if (!required) return []; throw new Error(`Missing or unreadable ${name}: ${error.message}`); }
}

function safe(value) { return String(value).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120); }
function color(value, fallback) { const clean = String(value ?? "").replace(/^#/, ""); return /^[0-9a-fA-F]{6}$/.test(clean) ? `#${clean}` : fallback; }

const [routes, stops, trips, stopTimes] = await Promise.all([
  readGtfs("routes.txt"), readGtfs("stops.txt"), readGtfs("trips.txt"), readGtfs("stop_times.txt"),
]);
const tripByRoute = new Map();
for (const trip of trips) if (!tripByRoute.has(trip.route_id)) tripByRoute.set(trip.route_id, trip.trip_id);
const timesByTrip = new Map();
for (const item of stopTimes) {
  const current = timesByTrip.get(item.trip_id) ?? [];
  current.push(item); timesByTrip.set(item.trip_id, current);
}
for (const values of timesByTrip.values()) values.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
const stopsById = new Map(stops.map((stop) => [stop.stop_id, stop]));
let chosen = routes.filter((route) => selectedRoutes.length === 0 || selectedRoutes.includes(route.route_id) || selectedRoutes.includes(route.route_short_name));
chosen = chosen.filter((route) => tripByRoute.has(route.route_id)).slice(0, maxRoutes);
if (chosen.length === 0) throw new Error("No usable routes found in GTFS data");
if (String(args.dryRun ?? "false") === "true") {
  console.log(`GTFS dry run passed: ${chosen.length} routes, ${stops.length} stops, ${trips.length} trips and ${stopTimes.length} stop-time rows.`);
  process.exit(0);
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const { default: pg } = await import("pg");
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
let runId;
try {
  await client.query("BEGIN");
  const sourceResult = await client.query(
    `INSERT INTO integration_sources(code,name,provider_type,enabled,status,metadata,updated_at)
     VALUES($1,$2,'gtfs',TRUE,'configured',$3::jsonb,NOW())
     ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,provider_type='gtfs',enabled=TRUE,updated_at=NOW()
     RETURNING id`,
    [sourceCode, sourceName, JSON.stringify({ directory: dir })],
  );
  const sourceId = sourceResult.rows[0].id;
  runId = (await client.query(`INSERT INTO integration_sync_runs(source_id,sync_type,status,records_received) VALUES($1,'static','running',$2) RETURNING id`, [sourceId, chosen.length])).rows[0].id;
  let appliedStops = 0;
  for (const [routeIndex, route] of chosen.entries()) {
    const tripId = tripByRoute.get(route.route_id);
    const ordered = timesByTrip.get(tripId) ?? [];
    const internalLineId = `EXT-${safe(sourceCode)}-${safe(route.route_id)}`;
    const short = route.route_short_name || route.route_id;
    const uniqueCode = `${sourceCode.toUpperCase()}-${short}`.slice(0, 80);
    const lineName = route.route_long_name || `Línea ${short}`;
    await client.query(
      `INSERT INTO lines(id,code,name_es,name_en,color,source_id,external_id)
       VALUES($1,$2,$3,$3,$4,$5,$6)
       ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name_es=EXCLUDED.name_es,name_en=EXCLUDED.name_en,color=EXCLUDED.color,source_id=EXCLUDED.source_id,external_id=EXCLUDED.external_id`,
      [internalLineId, uniqueCode, lineName, color(route.route_color, ["#1769aa","#d97706","#16803c"][routeIndex % 3]), sourceId, route.route_id],
    );
    await client.query("DELETE FROM line_stops WHERE line_id=$1", [internalLineId]);
    let sequence = 1;
    for (const item of ordered) {
      const stop = stopsById.get(item.stop_id);
      if (!stop || !Number.isFinite(Number(stop.stop_lat)) || !Number.isFinite(Number(stop.stop_lon))) continue;
      const internalStopId = `EXT-${safe(sourceCode)}-${safe(stop.stop_id)}`;
      const uniqueStopCode = `${sourceCode.toUpperCase()}-${stop.stop_code || stop.stop_id}`.slice(0, 100);
      const accessible = stop.wheelchair_boarding !== "2";
      await client.query(
        `INSERT INTO stops(id,code,name_es,name_en,latitude,longitude,accessible,source_id,external_id)
         VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8)
         ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name_es=EXCLUDED.name_es,name_en=EXCLUDED.name_en,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,accessible=EXCLUDED.accessible,source_id=EXCLUDED.source_id,external_id=EXCLUDED.external_id`,
        [internalStopId, uniqueStopCode, stop.stop_name || stop.stop_id, Number(stop.stop_lat), Number(stop.stop_lon), accessible, sourceId, stop.stop_id],
      );
      await client.query(`INSERT INTO line_stops(line_id,stop_id,sequence) VALUES($1,$2,$3)`, [internalLineId, internalStopId, sequence]);
      sequence += 1; appliedStops += 1;
    }
  }
  await client.query("UPDATE integration_sources SET status='healthy',last_static_sync_at=NOW(),last_error=NULL,updated_at=NOW() WHERE id=$1", [sourceId]);
  await client.query("UPDATE integration_sync_runs SET status='completed',records_applied=$2,message=$3,completed_at=NOW() WHERE id=$1", [runId, chosen.length, `${chosen.length} routes; ${appliedStops} route-stop records`]);
  await client.query("COMMIT");
  console.log(`GTFS import complete: ${chosen.length} routes and ${appliedStops} route-stop records from ${dir}`);
} catch (error) {
  await client.query("ROLLBACK");
  if (runId) await client.query("UPDATE integration_sync_runs SET status='failed',message=$2,completed_at=NOW() WHERE id=$1", [runId, error.message]).catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
