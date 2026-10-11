# SMAP Operational Continuity

Sprint 15 adds the controls required to operate SMAP after a controlled release.

## Service-level objectives

The demo contains four configurable SLOs:

- service availability: at least 99.5%;
- API p95 latency: at most 750 ms;
- stale telemetry: at most 5%;
- successful ticket purchases: at least 98%.

Each SLO has a target, warning threshold, observation window and latest measurement. Measurements may be entered manually or supplied by an external monitoring process.

## On-call coverage

The Continuity panel records named on-call shifts with contact details, start/end times and status. The readiness score is reduced when no active coverage exists.

## Continuity exercises

Supported exercise types are backup restore, failover, incident drill and communications. Exercises can be planned, completed or failed, with evidence and bilingual results.

## Incident postmortems

Postmortems are linked to service incidents and contain impact, root cause, corrective actions and owner. Resolved critical incidents without a published postmortem reduce the continuity score.

## Scoring

The score begins at 100 and is reduced by SLO breaches, warnings, missing on-call coverage, critical incidents, failed or overdue exercises and pending postmortems. The recommendation is `stable`, `watch` or `at_risk`.

## Commands

```powershell
npm.cmd run continuity:report
node --env-file=.env.local scripts/preflight.mjs
node --env-file=.env.local scripts/backup.mjs
```
