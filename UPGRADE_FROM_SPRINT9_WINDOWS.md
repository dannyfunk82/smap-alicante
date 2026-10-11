# Aggiornamento Windows da Sprint 9 a Sprint 10

1. Ferma l'app con `Ctrl + C`.
2. Estrai lo ZIP in `C:\dev\smap_web_sprint10`.
3. Copia `.env.local`:

```powershell
Copy-Item C:\dev\smap_web_sprint9\.env.local C:\dev\smap_web_sprint10\.env.local -Force
```

4. Verifica:

```powershell
cd C:\dev\smap_web_sprint10
Test-Path package.json
Test-Path .env.local
Test-Path database\010_pilot_operations.sql
```

5. Installa, migra e aggiorna i dati:

```powershell
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
node --env-file=.env.local scripts/seed.mjs
npm.cmd run check
```

6. Avvia:

```powershell
npm.cmd run dev
```

Dopo il login prova **Guía**, **Ayuda** e, come amministratore, **Pilot operativo**.
