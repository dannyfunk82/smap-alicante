# Aggiornamento a SMAP Web Sprint 7 — Windows

## 1. Ferma Sprint 6

Nel terminale di Next.js premi `Ctrl+C`.

## 2. Estrai il pacchetto

Estrai lo ZIP direttamente in:

```text
C:\dev\smap_web_sprint7
```

Verifica:

```powershell
Test-Path C:\dev\smap_web_sprint7\package.json
```

Deve restituire `True`.

## 3. Copia la configurazione

```powershell
Copy-Item `
  C:\dev\smap_web_sprint6\.env.local `
  C:\dev\smap_web_sprint7\.env.local `
  -Force
```

Se il file si trova in una sottocartella:

```powershell
$oldEnv = Get-ChildItem C:\dev\smap_web_sprint6 -Recurse -Force -Filter .env.local | Select-Object -First 1
Copy-Item $oldEnv.FullName C:\dev\smap_web_sprint7\.env.local -Force
```

## 4. Aggiungi la chiave di integrazione

```powershell
@'
INTEGRATION_API_KEY=SMAP-integration-local-key-2026-change-me
INTEGRATION_SOURCE_CODE=avanza-demo
SMAP_BASE_URL=http://localhost:3000
TELEMETRY_ITERATIONS=20
TELEMETRY_INTERVAL_MS=5000
'@ | Add-Content C:\dev\smap_web_sprint7\.env.local
```

Se avevi già queste righe, mantienine una sola copia.

## 5. Verifica i file

```powershell
cd C:\dev\smap_web_sprint7
Test-Path package.json
Test-Path .env.local
Test-Path database\007_external_integrations.sql
Test-Path scripts\import-gtfs.mjs
```

Risultato atteso: quattro `True`.

## 6. Installa e migra

```powershell
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
```

Risultato atteso:

```text
Applied migration: 007_external_integrations.sql
```

## 7. Aggiorna i dati demo

```powershell
node --env-file=.env.local scripts/seed.mjs
```

Il seed non sovrascrive la password esistente.

## 8. Esegui i controlli

```powershell
npm.cmd run check
```

Risultato atteso:

```text
SMAP Web Sprint 7 validation passed.
# tests 9
# pass 9
# fail 0
```

## 9. Avvia

```powershell
npm.cmd run dev
```

Apri `http://localhost:3000`, effettua logout/login e seleziona **Integraciones** nel menu amministratore.

## 10. Prova la telemetria esterna

Lascia l'app avviata e apri un secondo PowerShell:

```powershell
cd C:\dev\smap_web_sprint7
npm.cmd run telemetry:simulate
```

Nell'app:

1. apri `Integraciones`;
2. imposta `Modo de datos` su `Híbrido`;
3. seleziona `AVANZA demo connector`;
4. salva;
5. torna alla mappa.

Gli autobus esterni mostrano il contrassegno `API`. Se i dati diventano più vecchi della soglia configurata, SMAP usa automaticamente il fallback simulato.

## 11. Prova un GTFS minimo

```powershell
npm.cmd run gtfs:import -- --dir samples\gtfs_minimal --source sample --name "GTFS Sample" --maxRoutes 1
```

Aggiorna quindi la pagina `Integraciones` per vedere la sincronizzazione statica.
