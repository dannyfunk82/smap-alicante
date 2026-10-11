# Aggiornamento a SMAP Web Sprint 6 — Windows

## 1. Ferma Sprint 5

Nel terminale di Next.js premi `Ctrl+C`.

## 2. Estrai il pacchetto

Estrai lo ZIP direttamente in:

```text
C:\dev\smap_web_sprint6
```

Verifica:

```powershell
Test-Path C:\dev\smap_web_sprint6\package.json
```

Deve restituire `True`.

## 3. Copia la configurazione

```powershell
Copy-Item `
  C:\dev\smap_web_sprint5\.env.local `
  C:\dev\smap_web_sprint6\.env.local `
  -Force
```

Se lo Sprint 5 era in una sottocartella:

```powershell
$oldEnv = Get-ChildItem C:\dev\smap_web_sprint5 -Recurse -Force -Filter .env.local | Select-Object -First 1
Copy-Item $oldEnv.FullName C:\dev\smap_web_sprint6\.env.local -Force
```

## 4. Verifica i file

```powershell
cd C:\dev\smap_web_sprint6
Test-Path package.json
Test-Path .env.local
Test-Path database\006_security_operations.sql
```

Risultato atteso: tre `True`.

## 5. Installa e migra

```powershell
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
```

Risultato atteso:

```text
Applied migration: 006_security_operations.sql
```

## 6. Aggiorna i dati demo

```powershell
node --env-file=.env.local scripts/seed.mjs
```

Il seed Sprint 6 **non sovrascrive la password esistente** dell'account demo.

## 7. Test

```powershell
npm.cmd run check
```

Risultato atteso:

```text
SMAP Web Sprint 6 validation passed.
# tests 6
# pass 6
# fail 0
```

## 8. Avvia

```powershell
npm.cmd run dev
```

Apri `http://localhost:3000`.

## 9. Esci e accedi nuovamente

È consigliato effettuare logout/login dopo la migrazione. Nel menu amministratore troverai:

- `Panel demo`;
- `Operaciones`.

## Account bloccato per errori di password

Il blocco dura 15 minuti dopo 5 errori consecutivi. Per sbloccare manualmente l'account demo da pgAdmin:

```sql
UPDATE users
SET failed_login_attempts=0, locked_until=NULL
WHERE email='demo@smap.local';
```

## Backup prima della prova

```powershell
node --env-file=.env.local scripts/backup.mjs
```
