# SMAP 1.0 — Dizionario dati

## Mobilità

- `lines`, `stops`, `line_stops`, `buses`: rete e mezzi.
- `external_bus_positions`: telemetria esterna.

## Utenti e servizio

- `users`, `favorites`, `tickets`, `notifications`.
- `user_consents`, `feedback_reports`, `support_cases`.

## Pilot e governance

- coorti, inviti, campagne, questionari, KPI, decisioni e report.
- checklist go-live, approvazioni, release e rollback.
- SLO, turni, simulacri e postmortem.

## Handover

- `handover_checklist`: controlli obbligatori e relative evidenze.
- `handover_documents`: stato di revisione dei documenti.
- `acceptance_runs`: esiti immutabili delle prove di accettazione.

Le colonne temporali sono `TIMESTAMPTZ`; gli identificativi applicativi principali sono UUID. I dati personali non devono essere esportati senza una base giuridica e una finalità dichiarata.
