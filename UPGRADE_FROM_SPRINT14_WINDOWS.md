# Upgrade from SMAP Web Sprint 14 on Windows

## 1. Stop Sprint 14

Press `Ctrl + C` in the terminal running Next.js.

## 2. Extract Sprint 15

Extract the archive directly to:

```text
C:\dev\smap_web_sprint15
```

Verify:

```powershell
Test-Path C:\dev\smap_web_sprint15\package.json
```

## 3. Copy the local environment

```powershell
Copy-Item `
  C:\dev\smap_web_sprint14\.env.local `
  C:\dev\smap_web_sprint15\.env.local `
  -Force
```

## 4. Install and migrate

```powershell
cd C:\dev\smap_web_sprint15
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
node --env-file=.env.local scripts/seed.mjs
```

Expected migration:

```text
Applied migration: 015_operational_continuity.sql
```

## 5. Validate and start

```powershell
npm.cmd run check
npm.cmd run dev
```

Open `http://localhost:3000`, sign out and sign in again, then open **Continuidad**.
