# Aggiornamento Windows da SMAP Web Sprint 2 a Sprint 3

Lo ZIP dello Sprint 3 non contiene una cartella annidata: estraendolo in `C:\dev\smap_web_sprint3`, `package.json` sarà direttamente in quella cartella.

## 1. Ferma la versione precedente

Nel terminale di Next.js premi `Ctrl + C`.

## 2. Estrai il nuovo ZIP

Estrai tutto in:

```text
C:\dev\smap_web_sprint3
```

## 3. Copia `.env.local`

Trova la configurazione dello Sprint 2:

```powershell
$oldEnv = Get-ChildItem C:\dev\smap_web_sprint2 -Recurse -Force -Filter .env.local | Select-Object -First 1
$oldEnv.FullName
```

Copiala nel nuovo progetto:

```powershell
Copy-Item $oldEnv.FullName C:\dev\smap_web_sprint3\.env.local -Force
```

## 4. Verifica la cartella

```powershell
cd C:\dev\smap_web_sprint3
Test-Path package.json
Test-Path database\003_journeys_notifications.sql
Test-Path .env.local
```

Tutti devono restituire `True`.

## 5. Installa e aggiorna

```powershell
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
node --env-file=.env.local scripts/seed.mjs
```

La migrazione attesa è:

```text
Applied migration: 003_journeys_notifications.sql
```

## 6. Avvia

```powershell
npm.cmd run dev
```

Apri `http://localhost:3000`.

Credenziali demo:

```text
Email: demo@smap.local
Password: SmapDemo2026
```

## 7. Se il browser mostra una vecchia versione

```powershell
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run dev
```

Poi premi `Ctrl + Shift + R` nel browser.
