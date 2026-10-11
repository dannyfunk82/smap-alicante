# Web Sprint 18 — Maintenance and support pack

Sprint 18 consolidates the Windows distribution for long-term use without changing the database schema.

## Delivered

- read-only database integrity checker;
- JSON and Markdown maintenance reports;
- sanitized support bundle ZIP;
- safe repair workflow;
- side-by-side update with optional SHA-256 verification;
- new Windows control-panel actions;
- CMD launchers for diagnosis, repair and update;
- maintenance policy utilities and four additional automated tests.

## Database

No migration `018` exists. Existing Sprint 16 database schema remains valid.

## Safety

Repair and update create backups by default. Generated caches and runtime PID files may be removed; user, transport, ticket, audit and pilot data are not deleted.
