if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL non configurato");
const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const result = await client.query(`
    SELECT s.code AS source_code,s.name,s.status,s.last_static_sync_at,d.provider_name,d.valid_from,d.valid_to,
           d.route_count,d.stop_count,d.trip_count,d.stop_time_count,d.attribution_text,d.source_url,d.imported_at,
           i.mode,i.fallback_enabled,(i.active_source_id=s.id) AS active
      FROM integration_sources s
      JOIN gtfs_datasets d ON d.source_id=s.id
      JOIN integration_settings i ON i.id=1
     WHERE s.code='ute-mia-alicante'
  `);
  if (!result.rows.length) { console.log("Il feed reale di Alicante non è ancora importato."); process.exitCode = 2; }
  else console.log(JSON.stringify(result.rows[0], null, 2));
} finally { await client.end(); }
