# Aggiornamento Windows da Sprint 11 a Sprint 12

## 1. Ferma Sprint 11

Nel terminale di Next.js premi `Ctrl + C`.

## 2. Estrai Sprint 12

Estrai lo ZIP direttamente in:

```text
C:\dev\smap_web_sprint12
```

Verifica:

```powershell
Test-Path C:\dev\smap_web_sprint12\package.json
```

## 3. Copia la configurazione

```powershell
Copy-Item C:\dev\smap_web_sprint11\.env.local C:\dev\smap_web_sprint12\.env.local -Force
```

Se il file non è nella radice:

```powershell
$oldEnv = Get-ChildItem C:\dev\smap_web_sprint11 -Recurse -Force -Filter .env.local | Select-Object -First 1
Copy-Item $oldEnv.FullName C:\dev\smap_web_sprint12\.env.local -Force
```

## 4. Installa e migra

```powershell
cd C:\dev\smap_web_sprint12
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
node --env-file=.env.local scripts/seed.mjs
npm.cmd run check
```

La migrazione attesa è `012_pilot_closure_decisions.sql`.

## 5. Avvia

```powershell
npm.cmd run dev
```

Apri `http://localhost:3000`, esegui logout/login e prova **Resultados** e, come amministratore, **Cierre del piloto**.
