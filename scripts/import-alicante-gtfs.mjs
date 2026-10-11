import fs from "node:fs/promises";
import path from "node:path";

const rawArgs = process.argv.slice(2);
const args = {};
for (let index = 0; index < rawArgs.length; index += 1) {
  const item = rawArgs[index];
  if (!item.startsWith("--")) continue;
  const key = item.slice(2);
  const next = rawArgs[index + 1];
  args[key] = !next || next.startsWith("--") ? "true" : next;
  if (next && !next.startsWith("--")) index += 1;
}

if (!args.dir) throw new Error("Uso: npm run alicante:import -- --dir C:\\dati\\alicante_gtfs");

const dir = path.resolve(args.dir);
const sourceCode = String(args.source ?? "ute-mia-alicante").trim().toLowerCase();
const sourceName = String(args.name ?? "Autobuses urbanos de Alicante").trim();
const maxRoutes = Math.max(1, Math.min(200, Number(args.maxRoutes ?? 100)));
const simulateBuses = Math.max(0, Math.min(30, Number(args.simulateBuses ?? 6)));
const selectedRoutes = String(args.routes ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const activate = String(args.activate ?? "true") !== "false";

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const headers = rows.shift()?.map((value) => value.trim().replace(/^\uFEFF/, "")) ?? [];
  return rows.filter((values) => values.some((value) => value !== "")).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

async function readGtfs(name, required = true) {
  try { return parseCsv(await fs.readFile(path.join(dir, name), "utf8")); }
  catch (error) { if (!required) return []; throw new Error(`File GTFS mancante o non leggibile: ${name}. ${error.message}`); }
}

function safe(value) { return String(value).replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 110); }
function normalizedColor(value, fallback) { const clean = String(value ?? "").replace(/^#/, ""); return /^[0-9a-fA-F]{6}$/.test(clean) ? `#${clean}` : fallback; }
function date8(value) { return /^\d{8}$/.test(String(value)) ? `${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}` : null; }
function timeSeconds(value) {
  const match = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(String(value ?? ""));
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0;
}
function boolGtfs(value) { return String(value) === "1"; }

async function batchInsert(client, table, columns, rows, conflictSql = "") {
  const batchSize = Math.max(50, Math.floor(5000 / Math.max(1, columns.length)));
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const values = [];
    const placeholders = batch.map((row, rowIndex) => `(${columns.map((_, columnIndex) => {
      values.push(row[columnIndex]);
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    }).join(",")})`).join(",");
    await client.query(`INSERT INTO ${table}(${columns.join(",")}) VALUES ${placeholders} ${conflictSql}`, values);
  }
}

const [agency, routes, stops, trips, stopTimes, calendar, calendarDates, shapes] = await Promise.all([
  readGtfs("agency.txt", false), readGtfs("routes.txt"), readGtfs("stops.txt"), readGtfs("trips.txt"), readGtfs("stop_times.txt"),
  readGtfs("calendar.txt", false), readGtfs("calendar_dates.txt", false), readGtfs("shapes.txt", false),
]);

const stopTimesByTrip = new Map();
for (const item of stopTimes) {
  const list = stopTimesByTrip.get(item.trip_id) ?? [];
  list.push(item); stopTimesByTrip.set(item.trip_id, list);
}
for (const list of stopTimesByTrip.values()) list.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));

const tripsByRoute = new Map();
for (const trip of trips) {
  const list = tripsByRoute.get(trip.route_id) ?? [];
  list.push(trip); tripsByRoute.set(trip.route_id, list);
}

let chosenRoutes = routes.filter((route) => selectedRoutes.length === 0 || selectedRoutes.includes(route.route_id) || selectedRoutes.includes(route.route_short_name));
chosenRoutes = chosenRoutes.filter((route) => (tripsByRoute.get(route.route_id) ?? []).some((trip) => (stopTimesByTrip.get(trip.trip_id) ?? []).length > 1)).slice(0, maxRoutes);
if (!chosenRoutes.length) throw new Error("Nessuna linea utilizzabile trovata nel feed GTFS");

const chosenRouteIds = new Set(chosenRoutes.map((route) => route.route_id));
const chosenTrips = trips.filter((trip) => chosenRouteIds.has(trip.route_id));
const chosenTripIds = new Set(chosenTrips.map((trip) => trip.trip_id));
const chosenStopTimes = stopTimes.filter((item) => chosenTripIds.has(item.trip_id));
const referencedStopIds = new Set(chosenStopTimes.map((item) => item.stop_id));
const chosenStops = stops.filter((stop) => referencedStopIds.has(stop.stop_id));
const referencedShapeIds = new Set(chosenTrips.map((trip) => trip.shape_id).filter(Boolean));
const chosenShapes = shapes.filter((point) => referencedShapeIds.has(point.shape_id));

const representativeTripByRoute = new Map();
for (const route of chosenRoutes) {
  const routeTrips = tripsByRoute.get(route.route_id) ?? [];
  const representative = [...routeTrips].sort((a, b) => (stopTimesByTrip.get(b.trip_id)?.length ?? 0) - (stopTimesByTrip.get(a.trip_id)?.length ?? 0))[0];
  if (representative) representativeTripByRoute.set(route.route_id, representative);
}

const allDates = [
  ...calendar.flatMap((item) => [date8(item.start_date), date8(item.end_date)]),
  ...calendarDates.map((item) => date8(item.date)),
].filter(Boolean).sort();
const validFrom = args.validFrom ?? allDates[0] ?? null;
const validTo = args.validTo ?? allDates.at(-1) ?? null;
const providerName = agency[0]?.agency_name || "UTE MIA";
const sourceUrl = args.sourceUrl ?? "https://nap.transportes.gob.es/Files/Detail/1392";
const licenseUrl = args.licenseUrl ?? "https://nap.transportes.gob.es/licencia-datos";
const attribution = "Powered by MITRAMS";

if (String(args.dryRun ?? "false") === "true") {
  console.log(JSON.stringify({ providerName, routes: chosenRoutes.length, stops: chosenStops.length, trips: chosenTrips.length, stopTimes: chosenStopTimes.length, shapes: chosenShapes.length, validFrom, validTo }, null, 2));
  process.exit(0);
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL non configurato");

const { default: pg } = await import("pg");
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
let sourceId;
let runId;
try {
  await client.query("BEGIN");
  const sourceResult = await client.query(
    `INSERT INTO integration_sources(code,name,provider_type,enabled,status,base_url,metadata,updated_at)
     VALUES($1,$2,'gtfs',TRUE,'configured',$3,$4::jsonb,NOW())
     ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,provider_type='gtfs',enabled=TRUE,status='configured',base_url=EXCLUDED.base_url,metadata=EXCLUDED.metadata,updated_at=NOW()
     RETURNING id`,
    [sourceCode, sourceName, sourceUrl, JSON.stringify({ operator: providerName, attribution, licenseUrl, officialDataset: true, network: "Alicante urban bus", feedType: "GTFS static" })],
  );
  sourceId = sourceResult.rows[0].id;
  runId = (await client.query(`INSERT INTO integration_sync_runs(source_id,sync_type,status,records_received) VALUES($1,'static','running',$2) RETURNING id`, [sourceId, chosenStopTimes.length])).rows[0].id;

  await client.query("DELETE FROM gtfs_shapes WHERE source_id=$1", [sourceId]);
  await client.query("DELETE FROM gtfs_stop_times WHERE source_id=$1", [sourceId]);
  await client.query("DELETE FROM gtfs_trips WHERE source_id=$1", [sourceId]);
  await client.query("DELETE FROM gtfs_calendar_dates WHERE source_id=$1", [sourceId]);
  await client.query("DELETE FROM gtfs_calendar WHERE source_id=$1", [sourceId]);
  await client.query("DELETE FROM gtfs_routes WHERE source_id=$1", [sourceId]);
  await client.query("DELETE FROM gtfs_stops WHERE source_id=$1", [sourceId]);
  await client.query("DELETE FROM line_stops WHERE line_id IN (SELECT id FROM lines WHERE source_id=$1)", [sourceId]);

  const lineByRoute = new Map();
  for (const [routeIndex, route] of chosenRoutes.entries()) {
    const internalLineId = `GTFS-${safe(sourceCode)}-${safe(route.route_id)}`;
    const short = route.route_short_name || route.route_id;
    const lineCode = `ALC-${short}`.slice(0, 80);
    const lineName = route.route_long_name || `Línea ${short}`;
    await client.query(
      `INSERT INTO lines(id,code,name_es,name_en,color,source_id,external_id)
       VALUES($1,$2,$3,$3,$4,$5,$6)
       ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name_es=EXCLUDED.name_es,name_en=EXCLUDED.name_en,color=EXCLUDED.color,source_id=EXCLUDED.source_id,external_id=EXCLUDED.external_id`,
      [internalLineId, lineCode, lineName, normalizedColor(route.route_color, ["#006D77", "#E76F51", "#264653", "#F4A261", "#287271"][routeIndex % 5]), sourceId, route.route_id],
    );
    lineByRoute.set(route.route_id, internalLineId);
  }

  const stopByExternal = new Map();
  for (const stop of chosenStops) {
    const internalStopId = `GTFS-${safe(sourceCode)}-${safe(stop.stop_id)}`;
    const stopCode = `ALC-${stop.stop_code || stop.stop_id}`.slice(0, 100);
    const accessible = stop.wheelchair_boarding !== "2";
    await client.query(
      `INSERT INTO stops(id,code,name_es,name_en,latitude,longitude,accessible,source_id,external_id)
       VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name_es=EXCLUDED.name_es,name_en=EXCLUDED.name_en,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,accessible=EXCLUDED.accessible,source_id=EXCLUDED.source_id,external_id=EXCLUDED.external_id`,
      [internalStopId, stopCode, stop.stop_name || stop.stop_id, Number(stop.stop_lat), Number(stop.stop_lon), accessible, sourceId, stop.stop_id],
    );
    stopByExternal.set(stop.stop_id, internalStopId);
  }

  for (const route of chosenRoutes) {
    const trip = representativeTripByRoute.get(route.route_id);
    const ordered = trip ? stopTimesByTrip.get(trip.trip_id) ?? [] : [];
    const lineId = lineByRoute.get(route.route_id);
    let sequence = 1;
    const seen = new Set();
    for (const item of ordered) {
      const stopId = stopByExternal.get(item.stop_id);
      if (!stopId || seen.has(stopId)) continue;
      await client.query(`INSERT INTO line_stops(line_id,stop_id,sequence) VALUES($1,$2,$3) ON CONFLICT(line_id,stop_id) DO UPDATE SET sequence=EXCLUDED.sequence`, [lineId, stopId, sequence]);
      seen.add(stopId); sequence += 1;
    }
  }

  await batchInsert(client, "gtfs_routes", ["source_id","route_id","internal_line_id","agency_id","short_name","long_name","route_type","route_color","route_text_color"], chosenRoutes.map((route) => [sourceId, route.route_id, lineByRoute.get(route.route_id), route.agency_id || null, route.route_short_name || null, route.route_long_name || null, Number(route.route_type || 3), route.route_color || null, route.route_text_color || null]));
  await batchInsert(client, "gtfs_stops", ["source_id","stop_id","internal_stop_id","stop_code","stop_name","stop_lat","stop_lon","wheelchair_boarding","parent_station"], chosenStops.map((stop) => [sourceId, stop.stop_id, stopByExternal.get(stop.stop_id), stop.stop_code || null, stop.stop_name || stop.stop_id, Number(stop.stop_lat), Number(stop.stop_lon), stop.wheelchair_boarding ? Number(stop.wheelchair_boarding) : null, stop.parent_station || null]));
  if (calendar.length) await batchInsert(client, "gtfs_calendar", ["source_id","service_id","monday","tuesday","wednesday","thursday","friday","saturday","sunday","start_date","end_date"], calendar.map((item) => [sourceId,item.service_id,boolGtfs(item.monday),boolGtfs(item.tuesday),boolGtfs(item.wednesday),boolGtfs(item.thursday),boolGtfs(item.friday),boolGtfs(item.saturday),boolGtfs(item.sunday),date8(item.start_date),date8(item.end_date)]));
  if (calendarDates.length) await batchInsert(client, "gtfs_calendar_dates", ["source_id","service_id","service_date","exception_type"], calendarDates.map((item) => [sourceId,item.service_id,date8(item.date),Number(item.exception_type)]));
  await batchInsert(client, "gtfs_trips", ["source_id","trip_id","route_id","internal_line_id","service_id","trip_headsign","direction_id","shape_id"], chosenTrips.map((trip) => [sourceId,trip.trip_id,trip.route_id,lineByRoute.get(trip.route_id),trip.service_id,trip.trip_headsign || null,trip.direction_id === "" || trip.direction_id == null ? null : Number(trip.direction_id),trip.shape_id || null]));
  await batchInsert(client, "gtfs_stop_times", ["source_id","trip_id","stop_id","internal_stop_id","arrival_seconds","departure_seconds","stop_sequence"], chosenStopTimes.map((item) => [sourceId,item.trip_id,item.stop_id,stopByExternal.get(item.stop_id) ?? null,timeSeconds(item.arrival_time),timeSeconds(item.departure_time),Number(item.stop_sequence)]));
  if (chosenShapes.length) await batchInsert(client, "gtfs_shapes", ["source_id","shape_id","point_sequence","latitude","longitude","distance_traveled"], chosenShapes.map((point) => [sourceId,point.shape_id,Number(point.shape_pt_sequence),Number(point.shape_pt_lat),Number(point.shape_pt_lon),point.shape_dist_traveled ? Number(point.shape_dist_traveled) : null]));

  await client.query(
    `INSERT INTO gtfs_datasets(source_id,dataset_code,provider_name,source_url,license_url,attribution_text,feed_sha1,valid_from,valid_to,route_count,stop_count,trip_count,stop_time_count,imported_at,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),$14::jsonb)
     ON CONFLICT(source_id) DO UPDATE SET dataset_code=EXCLUDED.dataset_code,provider_name=EXCLUDED.provider_name,source_url=EXCLUDED.source_url,license_url=EXCLUDED.license_url,attribution_text=EXCLUDED.attribution_text,feed_sha1=EXCLUDED.feed_sha1,valid_from=EXCLUDED.valid_from,valid_to=EXCLUDED.valid_to,route_count=EXCLUDED.route_count,stop_count=EXCLUDED.stop_count,trip_count=EXCLUDED.trip_count,stop_time_count=EXCLUDED.stop_time_count,imported_at=NOW(),metadata=EXCLUDED.metadata`,
    [sourceId,"autobuses-urbanos-alicante",providerName,sourceUrl,licenseUrl,attribution,args.feedSha1 ?? null,validFrom,validTo,chosenRoutes.length,chosenStops.length,chosenTrips.length,chosenStopTimes.length,JSON.stringify({ officialNapDatasetId: 1392, napFileId: 1607, fullStaticNetwork: selectedRoutes.length === 0 && chosenRoutes.length === routes.length })],
  );

  const lineIds = [...lineByRoute.values()];
  for (let index = 0; index < simulateBuses && lineIds.length; index += 1) {
    const busId = `ALC-SIM-${String(index + 1).padStart(2,"0")}`;
    const busCode = `ALC-SIM-${String(index + 1).padStart(2,"0")}`;
    await client.query(
      `INSERT INTO buses(id,code,line_id,capacity,status,source_id,external_id)
       VALUES($1,$2,$3,75,'demo',NULL,NULL)
       ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,line_id=EXCLUDED.line_id,capacity=EXCLUDED.capacity,status='demo',source_id=NULL,external_id=NULL`,
      [busId,busCode,lineIds[index % lineIds.length]],
    );
  }

  await client.query("UPDATE integration_sources SET status='healthy',last_static_sync_at=NOW(),last_error=NULL,updated_at=NOW() WHERE id=$1", [sourceId]);
  if (activate) await client.query("UPDATE integration_settings SET mode='hybrid',fallback_enabled=TRUE,active_source_id=$1,updated_at=NOW() WHERE id=1", [sourceId]);
  await client.query("UPDATE integration_sync_runs SET status='completed',records_applied=$2,message=$3,completed_at=NOW() WHERE id=$1", [runId, chosenStopTimes.length, `${chosenRoutes.length} routes; ${chosenStops.length} stops; ${chosenTrips.length} trips; ${chosenStopTimes.length} stop times`]);
  await client.query("COMMIT");
  console.log(`Importazione completata: ${chosenRoutes.length} linee, ${chosenStops.length} fermate, ${chosenTrips.length} corse e ${chosenStopTimes.length} orari.`);
  console.log(`Fonte attiva: ${sourceName}. Modalità: ${activate ? "ibrida" : "invariata"}. Autobus simulati sulle linee reali: ${simulateBuses}.`);
  console.log(`${attribution} — ${sourceUrl}`);
} catch (error) {
  await client.query("ROLLBACK");
  if (runId) await client.query("UPDATE integration_sync_runs SET status='failed',message=$2,completed_at=NOW() WHERE id=$1", [runId, error.message]).catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
