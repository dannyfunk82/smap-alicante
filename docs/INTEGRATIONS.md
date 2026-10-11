# Integrazioni GTFS e telemetria esterna

## Obiettivo

Sprint 7 separa la UI dalla provenienza dei dati. SMAP può usare:

- `demo`: solo simulazione interna;
- `hybrid`: telemetria esterna fresca e fallback demo per linee non coperte;
- `external`: solo dati esterni, con fallback demo opzionale quando il feed è assente o obsoleto.

## Feed statico GTFS

L'importatore supporta una cartella GTFS estratta con `routes.txt`, `stops.txt`, `trips.txt` e `stop_times.txt`. Per ogni linea selezionata viene usata la prima corsa disponibile come sequenza rappresentativa delle fermate.

Questa è una base di integrazione, non un validatore GTFS completo. Prima della produzione andranno gestiti calendari, varianti di corsa, forme, frequenze e aggiornamenti incrementali.

## Telemetria realtime

Endpoint:

```text
POST /api/integrations/telemetry
Content-Type: application/json
x-smap-integration-key: <chiave>
```

Payload:

```json
{
  "sourceCode": "avanza-demo",
  "vehicles": [
    {
      "vehicleId": "BUS-401",
      "lineCode": "L1",
      "latitude": 38.3452,
      "longitude": -0.4815,
      "direction": "outbound",
      "etaSeconds": 180,
      "passengerCount": 38,
      "capacity": 70,
      "occupancyPercentage": 54,
      "status": "in_service",
      "recordedAt": "2026-07-24T18:00:00Z"
    }
  ]
}
```

Per reti importate da GTFS è preferibile inviare `lineExternalId` e `nextStopExternalId`, perché identificano i codici originali del feed.

## Freschezza e fallback

`max_age_seconds` definisce quando un dato realtime diventa obsoleto. Un mezzo obsoleto è marcato `gps_lost` e non viene utilizzato per ETA o pianificazione.

Il fallback evita che la demo resti vuota in caso di feed non disponibile. In produzione questa scelta deve essere comunicata chiaramente agli utenti e i dati simulati non devono essere presentati come reali.

## Sicurezza

- la chiave di integrazione è letta da `INTEGRATION_API_KEY`;
- non deve essere inclusa nel browser o nel repository;
- l'endpoint accetta al massimo 200 veicoli per richiesta;
- gli aggiornamenti sono registrati in `integration_sync_runs`;
- le modifiche amministrative sono registrate nell'audit log.

Per produzione sono necessari rotazione delle chiavi, allowlist IP, TLS, rate limiting distribuito e autenticazione machine-to-machine più robusta.
