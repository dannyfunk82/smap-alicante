# SMAP Web Sprint 18 validation report

## Scope

Maintenance and long-term support pack derived from the Sprint 17 Windows Operations Pack.

## Passed checks

- source structure validation;
- 49 automated Node tests;
- Node syntax validation for all `.mjs` and `.js` files;
- required Windows maintenance scripts present;
- Windows control menu linked to diagnosis, repair, integrity and update;
- integrity checker covers users, network topology, coordinates, tickets, favorites and external telemetry;
- support bundle design excludes raw `.env.local` values;
- package does not contain `.env.local`, `node_modules`, `.next`, runtime PID files, logs, backups or support bundles;
- ZIP root contains `package.json` directly.

## Not executed in the generation environment

- PowerShell execution on Windows;
- live PostgreSQL integrity queries;
- npm dependency download and full Next.js build;
- support bundle creation through Windows `Compress-Archive`;
- end-to-end side-by-side update on a Windows host.

These operations must be completed on the target PC using `windows\\SMAP_CONTROL.cmd`.
