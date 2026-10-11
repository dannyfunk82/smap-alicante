# SMAP long-term maintenance

Sprint 18 adds a non-destructive maintenance toolkit for Windows installations of SMAP Web 1.0.

## Principles

- Never update the working installation in place.
- Create and verify a database backup before repair or upgrade.
- Preserve `.env.local`; never include its values in support bundles.
- Run migrations, integrity checks and automated tests before switching versions.
- Keep the previous installation until the new one passes smoke tests.

## Data integrity

Run:

```powershell
npm.cmd run integrity:report
```

Outputs:

- `reports/data-integrity.json`
- `reports/data-integrity.md`

The checker validates migrations, duplicate identifiers, coordinates, line topology, ticket dates, favorites and external telemetry. It does not modify data.

## Diagnostic support bundle

Double-click `windows\DIAGNOSE_SMAP.cmd` or run:

```powershell
windows\Diagnose-SMAP.ps1 -OpenFolder
```

The resulting ZIP in `support-bundles\` contains sanitized environment metadata, health/readiness responses, recent logs, integrity findings and automated-check output. Secrets are represented only as configured/empty.

Use `-Quick` to skip the full test suite.

## Safe repair

Run:

```powershell
windows\Repair-SMAP.ps1
```

The repair flow creates a verified backup, stops SMAP, removes only generated cache/runtime files, restores npm dependencies, reapplies pending migrations, checks data integrity and runs all tests. It does not delete application data.

## Side-by-side update

Run:

```powershell
windows\Update-SMAP.ps1 -PackageZip C:\Downloads\smap_web_new.zip
```

When a sibling SHA-256 file is present it is verified. The update is installed in a new folder, the current `.env.local` is copied, migrations and tests are executed, and the current installation is kept untouched. Switch to the new folder only after successful startup and smoke tests.

## Routine schedule

Recommended:

- Daily: health/status review.
- Weekly: verified backup and integrity report.
- Monthly: diagnostic bundle, dependency review and restore drill.
- Before every update: verified backup, checksum verification, side-by-side install and smoke test.

## Recovery

If a new version fails, stop it and restart the previous folder. Database migrations in this project are forward-only; restore the verified pre-update backup if a database rollback is required.
