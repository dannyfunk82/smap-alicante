# Aggiornamento a SMAP Web Sprint 8 — Windows

## 1. Ferma Sprint 7

Nel terminale di Next.js premi `Ctrl+C`.

## 2. Estrai il pacchetto

Estrai lo ZIP direttamente in:

```text
C:\dev\smap_web_sprint8
```

Verifica:

```powershell
Test-Path C:\dev\smap_web_sprint8\package.json
```

Deve restituire `True`.

## 3. Copia la configurazione

```powershell
Copy-Item `
  C:\dev\smap_web_sprint7\.env.local `
  C:\dev\smap_web_sprint8\.env.local `
  -Force
```

Se il file si trova in una sottocartella:

```powershell
$oldEnv = Get-ChildItem C:\dev\smap_web_sprint7 -Recurse -Force -Filter .env.local | Select-Object -First 1
Copy-Item $oldEnv.FullName C:\dev\smap_web_sprint8\.env.local -Force
```

## 4. Aggiungi la configurazione Sprint 8

```powershell
@'
SMAP_ENVIRONMENT=local
SMAP_RELEASE=local-0.8.0
NEXT_DEPLOYMENT_ID=local-0.8.0
PORT=3000
'@ | Add-Content C:\dev\smap_web_sprint8\.env.local
```

Se queste righe sono già presenti, mantienine una sola copia.

## 5. Verifica i file

```powershell
cd C:\dev\smap_web_sprint8
Test-Path package.json
Test-Path .env.local
Test-Path database\008_release_observability.sql
Test-Path components\SystemPanel.tsx
```

Risultato atteso: quattro `True`.

## 6. Installa e migra

```powershell
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
```

Risultato atteso:

```text
Applied migration: 008_release_observability.sql
```

## 7. Aggiorna i dati demo

```powershell
node --env-file=.env.local scripts/seed.mjs
```

Il seed non modifica la password esistente.

## 8. Esegui i controlli

```powershell
npm.cmd run check
node --env-file=.env.local scripts/preflight.mjs
```

Il controllo deve terminare con:

```text
SMAP Web Sprint 8 validation passed.
# tests 12
# pass 12
# fail 0
```

## 9. Avvia

```powershell
npm.cmd run dev
```

Apri `http://localhost:3000`, effettua logout/login e seleziona **Sistema** nel menu amministratore.

## 10. Prova il nuovo flusso

1. esegui le comprobazioni dal pannello **Sistema**;
2. attiva il modo manutenzione e verifica il banner;
3. apri `http://localhost:3000/status`;
4. crea una incidencia di prova;
5. registra un rilascio locale;
6. in un secondo PowerShell esegui:

```powershell
cd C:\dev\smap_web_sprint8
node --env-file=.env.local scripts/smoke-test.mjs
```
