# Aggiornamento Windows da Sprint 10 a Sprint 11

## 1. Ferma Sprint 10

Premi `Ctrl + C` nel terminale di Next.js.

## 2. Estrai Sprint 11

Estrai lo ZIP in:

```text
C:\dev\smap_web_sprint11
```

## 3. Copia la configurazione

```powershell
Copy-Item C:\dev\smap_web_sprint10\.env.local C:\dev\smap_web_sprint11\.env.local -Force
```

Se il file non viene trovato:

```powershell
$oldEnv = Get-ChildItem C:\dev\smap_web_sprint10 -Recurse -Force -Filter .env.local | Select-Object -First 1
Copy-Item $oldEnv.FullName C:\dev\smap_web_sprint11\.env.local -Force
```

## 4. Verifica

```powershell
cd C:\dev\smap_web_sprint11
Test-Path package.json
Test-Path .env.local
Test-Path database\011_campaigns_surveys.sql
```

I tre risultati devono essere `True`.

## 5. Installa, migra e aggiorna i dati

```powershell
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
node --env-file=.env.local scripts/seed.mjs
npm.cmd run check
```

La migrazione attesa è:

```text
Applied migration: 011_campaigns_surveys.sql
```

## 6. Avvia

```powershell
npm.cmd run dev
```

Apri `http://localhost:3000`, effettua logout e login e prova le sezioni `Campañas` e `Campañas piloto`.
