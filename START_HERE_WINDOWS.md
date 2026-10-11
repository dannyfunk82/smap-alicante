# Avvio consigliato: pannello one-click

Questa versione include `windows\SMAP_CONTROL.cmd`, che automatizza installazione, avvio, stato, arresto e backup. Consulta anche `START_HERE_WINDOWS_ONE_CLICK.md`.

---

# Avvio SMAP Web 1.0 su Windows

```powershell
cd C:\dev\smap_web_sprint16
Copy-Item .env.example .env.local
notepad .env.local
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
node --env-file=.env.local scripts/seed.mjs
npm.cmd run check
npm.cmd run acceptance
npm.cmd run dev
```

Apri `http://localhost:3000` e accedi con `demo@smap.local` / `SmapDemo2026`.
