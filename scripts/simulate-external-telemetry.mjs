const baseUrl = process.env.SMAP_BASE_URL ?? "http://localhost:3000";
const key = process.env.INTEGRATION_API_KEY;
if (!key) throw new Error("INTEGRATION_API_KEY is required in .env.local");
const sourceCode = process.env.INTEGRATION_SOURCE_CODE ?? "avanza-demo";
const count = Math.max(1, Math.min(1000, Number(process.env.TELEMETRY_ITERATIONS ?? 20)));
const interval = Math.max(500, Number(process.env.TELEMETRY_INTERVAL_MS ?? 5000));
const lines = [
  { code: "L1", lat: 38.3450, lng: -0.4930, dlat: .0021, dlng: .0011 },
  { code: "L2", lat: 38.3436, lng: -0.4914, dlat: -.0005, dlng: .0024 },
  { code: "L3", lat: 38.3454, lng: -0.4901, dlat: .0025, dlng: .0022 },
];
for (let iteration = 0; iteration < count; iteration += 1) {
  const vehicles = lines.flatMap((line, lineIndex) => [0, 1].map((busIndex) => {
    const progress = ((iteration / 12) + busIndex * .42 + lineIndex * .17) % 1;
    const passengerCount = 12 + ((iteration * 7 + lineIndex * 17 + busIndex * 13) % 55);
    return {
      vehicleId: `AV-${lineIndex + 1}0${busIndex + 1}`,
      lineCode: line.code,
      latitude: line.lat + line.dlat * 9 * progress,
      longitude: line.lng + line.dlng * 9 * progress,
      direction: "outbound",
      etaSeconds: Math.max(25, Math.round((1 - progress) * 240)),
      passengerCount,
      capacity: 70,
      occupancyPercentage: Math.round(passengerCount * 100 / 70),
      status: "in_service",
      recordedAt: new Date().toISOString(),
    };
  }));
  const response = await fetch(`${baseUrl}/api/integrations/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-smap-integration-key": key },
    body: JSON.stringify({ sourceCode, vehicles }),
  });
  const data = await response.json().catch(() => ({}));
  console.log(`[${iteration + 1}/${count}]`, response.status, data);
  if (!response.ok) process.exitCode = 1;
  if (iteration < count - 1) await new Promise((resolve) => setTimeout(resolve, interval));
}
