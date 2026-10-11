const base = (process.env.SMAP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const paths = ["/api/health", "/api/ready", "/api/status?lang=es"];
let failed = false;
for (const path of paths) {
  const started = performance.now();
  try {
    const response = await fetch(`${base}${path}`, { headers: { "x-smoke-test": "smap-web-1.0.0" } });
    const text = await response.text();
    let body; try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
    const ok = response.ok;
    console.log(JSON.stringify({ path, ok, status: response.status, latencyMs: Math.round(performance.now() - started), body }));
    if (!ok) failed = true;
  } catch (error) {
    failed = true;
    console.error(JSON.stringify({ path, ok: false, error: error instanceof Error ? error.message : String(error) }));
  }
}
if (failed) process.exitCode = 1;
