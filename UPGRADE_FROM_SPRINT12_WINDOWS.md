# Aggiornamento da SMAP Web Sprint 12 a Sprint 13

## 1. Ferma l’app

Nel terminale dello Sprint 12 premi `Ctrl+C`.

## 2. Estrai il pacchetto

Estrai lo ZIP direttamente in:

```text
C:\dev\smap_web_sprint13
```

Verifica:

```powershell
Test-Path C:\dev\smap_web_sprint13\package.json
```

Deve restituire `True`.

## 3. Copia la configurazione

```powershell
Copy-Item C:\dev\smap_web_sprint12\.env.local C:\dev\smap_web_sprint13\.env.local -Force
```

Se il file non viene trovato:

```powershell
$oldEnv = Get-ChildItem C:\dev\smap_web_sprint12 -Recurse -Force -Filter .env.local | Select-Object -First 1
Copy-Item $oldEnv.FullName C:\dev\smap_web_sprint13\.env.local -Force
```

## 4. Installa e migra

```powershell
cd C:\dev\smap_web_sprint13
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
node --env-file=.env.local scripts/seed.mjs
```

Risultato atteso:

```text
Applied migration: 013_go_live_governance.sql
```

## 5. Verifica

```powershell
npm.cmd run check
node --env-file=.env.local scripts/preflight.mjs
```

## 6. Avvia

```powershell
npm.cmd run dev
```

Apri `http://localhost:3000`, effettua logout e login, quindi seleziona **Go-live**.
