# Aggiornamento SMAP Web: Sprint 3 → Sprint 4 (Windows, senza Docker)

## 1. Ferma Sprint 3

Nel terminale di Next.js premi `Ctrl + C`.

## 2. Estrai il pacchetto

Estrai lo ZIP in:

```text
C:\dev\smap_web_sprint4
```

Verifica che esista direttamente:

```text
C:\dev\smap_web_sprint4\package.json
```

## 3. Copia la configurazione locale

```powershell
Copy-Item C:\dev\smap_web_sprint3\.env.local C:\dev\smap_web_sprint4\.env.local -Force
```

Se Sprint 3 era in una sottocartella:

```powershell
$oldEnv = Get-ChildItem C:\dev\smap_web_sprint3 -Recurse -Force -Filter .env.local | Select-Object -First 1
Copy-Item $oldEnv.FullName C:\dev\smap_web_sprint4\.env.local -Force
```

## 4. Verifica i file

```powershell
cd C:\dev\smap_web_sprint4
Test-Path package.json
Test-Path .env.local
Test-Path database\004_admin_simulation.sql
```

Devono risultare tutti `True`.

## 5. Installa le dipendenze

```powershell
npm.cmd install
```

## 6. Applica la nuova migrazione

```powershell
node --env-file=.env.local scripts/migrate.mjs
```

Risultato atteso:

```text
Applied migration: 004_admin_simulation.sql
```

## 7. Aggiorna i dati demo

```powershell
node --env-file=.env.local scripts/seed.mjs
```

Il seed assegna il ruolo amministratore a `demo@smap.local` e crea i controlli dei sei autobus.

## 8. Esci e rientra nell'app

È importante fare logout, perché il vecchio cookie dello Sprint 3 non contiene il ruolo amministratore.

Credenziali:

```text
Email: demo@smap.local
Password: SmapDemo2026
```

## 9. Avvia Sprint 4

```powershell
npm.cmd run dev
```

Apri `http://localhost:3000`.

Nel menu vedrai **Panel demo / Demo controls**.
