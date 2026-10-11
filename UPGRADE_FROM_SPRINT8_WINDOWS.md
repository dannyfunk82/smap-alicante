# Aggiornamento Windows: Sprint 8 → Sprint 9

## 1. Ferma Sprint 8

Nel terminale di Next.js premi `Ctrl + C`.

## 2. Estrai il pacchetto

Estrai lo ZIP in:

```text
C:\dev\smap_web_sprint9
```

Verifica:

```powershell
Test-Path C:\dev\smap_web_sprint9\package.json
```

## 3. Copia la configurazione

```powershell
Copy-Item C:\dev\smap_web_sprint8\.env.local C:\dev\smap_web_sprint9\.env.local -Force
```

Se il file non è nella radice:

```powershell
$oldEnv = Get-ChildItem C:\dev\smap_web_sprint8 -Recurse -Force -Filter .env.local | Select-Object -First 1
Copy-Item $oldEnv.FullName C:\dev\smap_web_sprint9\.env.local -Force
```

## 4. Installa e migra

```powershell
cd C:\dev\smap_web_sprint9
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
node --env-file=.env.local scripts/seed.mjs
npm.cmd run check
```

La migrazione attesa è:

```text
Applied migration: 009_pilot_privacy_feedback.sql
```

## 5. Avvia

```powershell
npm.cmd run dev
```

Apri `http://localhost:3000`, esegui logout/login e prova:

- Opinión / Feedback;
- Privacidad / Privacy;
- Piloto / Pilot, disponibile all'utente amministratore demo.

Credenziali demo:

```text
Email: demo@smap.local
Password: SmapDemo2026
```
