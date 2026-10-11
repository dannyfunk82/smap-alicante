# Backup e recupero

## Backup JSON verificabile

Dalla cartella del progetto:

```powershell
node --env-file=.env.local scripts/backup.mjs
```

Vengono creati nella cartella `backups`:

```text
smap-backup-<data>.json
smap-backup-<data>.json.sha256
```

Verifica:

```powershell
node scripts/verify-backup.mjs backups\smap-backup-<data>.json
```

Il backup JSON contiene anche hash password e audit: conservarlo in un luogo protetto.

## Backup PostgreSQL consigliato

```powershell
$env:PGPASSWORD = "smap_dev_password"
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
  -h localhost -p 5432 -U smap -d smap -F c `
  -f "C:\dev\smap_backups\smap.backup"
Remove-Item Env:PGPASSWORD
```

## Ripristino PostgreSQL

Esegui solo su un database vuoto o su una copia di test:

```powershell
$env:PGPASSWORD = "smap_dev_password"
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" `
  -h localhost -p 5432 -U smap -d smap `
  --clean --if-exists "C:\dev\smap_backups\smap.backup"
Remove-Item Env:PGPASSWORD
```

Adatta `18` alla versione installata. Prima di un ripristino reale, ferma l'app e crea un ulteriore backup.

## Sprint 7

Il backup 0.7.0 include anche:

- `integration_sources`;
- `integration_settings`;
- `external_bus_positions`;
- `integration_sync_runs`.

Le chiavi API di integrazione non vengono salvate nel backup perché risiedono in `.env.local`.

## Sprint 8

Il backup 0.11.0 include inoltre:

- `runtime_settings`;
- `deployment_releases`;
- `system_checks`;
- `service_incidents`.

I segreti, i certificati e i file `.env*.local` non vengono inclusi e devono essere conservati in un sistema sicuro separato.

Le tabelle dello Sprint 11 incluse nel backup sono: `pilot_campaigns`, `pilot_surveys`, `pilot_survey_questions`, `pilot_survey_responses`, `pilot_survey_answers` e `pilot_broadcasts`.

## Tabelle Sprint 12

Il backup 1.0.0 include anche:

- `pilot_kpi_snapshots`;
- `pilot_improvement_actions`;
- `pilot_decisions`;
- `pilot_final_reports`.

Queste tabelle conservano la fotografia dei KPI, il backlog di miglioramento, il registro decisionale e i rapporti finali del pilot.

## Retention — Sprint 13

La pulizia dei dati deve essere preceduta da un backup verificato. Usa prima la modalità di anteprima:

```powershell
node --env-file=.env.local scripts/retention.mjs
```

Solo dopo la verifica del numero di righe:

```powershell
node --env-file=.env.local scripts/retention.mjs --execute --confirm-delete
```

## Tabelle Sprint 14

Il backup `1.0.0` include anche:

- `release_plans`;
- `release_steps`;
- `release_health_observations`;
- `release_rollback_points`;
- `release_rollbacks`.
