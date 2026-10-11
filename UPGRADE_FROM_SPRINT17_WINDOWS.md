# Upgrade from SMAP Web Sprint 17 to Sprint 18

Sprint 18 does not change the database schema.

## 1. Stop Sprint 17

```powershell
C:\dev\smap_web_sprint17\windows\STOP_SMAP.cmd
```

## 2. Extract Sprint 18

Extract the ZIP directly to:

```text
C:\dev\smap_web_sprint18
```

Verify:

```powershell
Test-Path C:\dev\smap_web_sprint18\package.json
```

## 3. Copy local configuration

```powershell
Copy-Item C:\dev\smap_web_sprint17\.env.local C:\dev\smap_web_sprint18\.env.local -Force
```

## 4. Install and validate

```powershell
cd C:\dev\smap_web_sprint18
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
npm.cmd run check
npm.cmd run integrity:report
```

There is no migration `018`; the migration command simply verifies and applies any missing earlier migrations.

## 5. Start

Double-click:

```text
C:\dev\smap_web_sprint18\windows\SMAP_CONTROL.cmd
```

Choose option 2 for development or option 3 for a production build.

## 6. Verify maintenance tools

Use menu option 10 to create a support bundle, option 11 for safe repair and option 12 for the read-only integrity report.

Keep Sprint 17 until Sprint 18 has passed health, smoke and login tests.
