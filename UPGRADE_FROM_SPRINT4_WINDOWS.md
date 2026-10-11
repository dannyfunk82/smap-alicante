# Aggiornamento SMAP Web da Sprint 4 a Sprint 5 — Windows

Lo Sprint 5 mantiene lo stesso database PostgreSQL e lo stesso account demo.

## 1. Ferma lo Sprint 4

Nel terminale dove è attiva l'app premi:

```text
Ctrl + C
```

## 2. Estrai il nuovo archivio

Estrai `smap_web_sprint5.zip` direttamente in:

```text
C:\dev\smap_web_sprint5
```

La struttura corretta deve contenere direttamente:

```text
C:\dev\smap_web_sprint5\package.json
C:\dev\smap_web_sprint5\database\005_accessibility_quality.sql
```

## 3. Copia la configurazione locale

```powershell
Copy-Item `
  C:\dev\smap_web_sprint4\.env.local `
  C:\dev\smap_web_sprint5\.env.local `
  -Force
```

Se il file dello Sprint 4 si trova in una sottocartella:

```powershell
$oldEnv = Get-ChildItem C:\dev\smap_web_sprint4 `
  -Recurse `
  -Force `
  -Filter .env.local |
  Select-Object -First 1

Copy-Item `
  $oldEnv.FullName `
  C:\dev\smap_web_sprint5\.env.local `
  -Force
```

## 4. Verifica i file

```powershell
cd C:\dev\smap_web_sprint5

Test-Path package.json
Test-Path .env.local
Test-Path database\005_accessibility_quality.sql
```

I tre risultati devono essere `True`.

## 5. Installa le dipendenze

```powershell
npm.cmd install
```

## 6. Aggiorna il database

```powershell
node --env-file=.env.local scripts/migrate.mjs
```

Risultato atteso:

```text
Applied migration: 005_accessibility_quality.sql
```

## 7. Aggiorna i dati demo

```powershell
node --env-file=.env.local scripts/seed.mjs
```

## 8. Esegui i controlli automatici

```powershell
npm.cmd run check
```

Risultati attesi:

```text
SMAP Web Sprint 5 validation passed.
# tests 3
# pass 3
# fail 0
```

## 9. Avvia l'app

```powershell
npm.cmd run dev
```

Apri:

```text
http://localhost:3000
```

Credenziali demo:

```text
Email: demo@smap.local
Password: SmapDemo2026
```

## 10. Prova le nuove funzioni

- apri **Resumen / Overview**;
- prova le scorciatoie `Alt+1` fino a `Alt+5`;
- apri **Perfil / Profile**;
- attiva contrasto elevato;
- seleziona testo grande o molto grande;
- disattiva le animazioni;
- modifica le preferenze delle notifiche;
- ricarica la pagina e verifica che le preferenze rimangano salvate.

## Build di produzione facoltativa

```powershell
npm.cmd run build
npm.cmd run start
```

La modalità installabile e il service worker sono attivi solo nella build di produzione.
