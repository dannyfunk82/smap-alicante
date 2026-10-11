# Pubblicazione SMAP Web

## Modello consigliato

- PostgreSQL gestito o installato su server dedicato;
- processo Node.js eseguito con `next start`/standalone;
- reverse proxy nginx davanti all'applicazione;
- HTTPS obbligatorio;
- backup PostgreSQL e backup JSON SMAP;
- monitoraggio di `/api/health` e `/api/ready`.

## Preparazione

1. copia `.env.production.example` in `.env.production.local`;
2. cambia password e segreti;
3. imposta dominio, ambiente e deployment ID;
4. esegui migrazione e backup;
5. esegui preflight;
6. crea la build;
7. registra il rilascio;
8. avvia e lancia lo smoke test.

```powershell
node --env-file=.env.production.local scripts/backup.mjs
node --env-file=.env.production.local scripts/migrate.mjs
node --env-file=.env.production.local scripts/preflight.mjs
npm.cmd run build
node --env-file=.env.production.local scripts/release.mjs -- --version=1.0.0 --environment=production --status=deployed
node --env-file=.env.production.local scripts/production-start.mjs
```

## Reverse proxy

Il file `deploy/nginx/smap.conf` è un modello. Sostituisci il dominio e i percorsi dei certificati.

## Windows

`deploy/windows/start-production.ps1` esegue preflight, build, registrazione release e avvio. Per un servizio permanente usa un service manager aziendale o un'attività pianificata con account dedicato.

## Linux

Copia il progetto in `/opt/smap-web`, crea l'utente `smap`, configura `.env.production.local`, quindi adatta `deploy/systemd/smap-web.service`.

## Gate di go-live — Sprint 13

Prima di registrare un rilascio production come `deployed`:

1. completa la checklist nel pannello **Go-live**;
2. esegui i controlli di sistema;
3. registra un'approvazione `approved` o `conditional` per la versione;
4. salva uno snapshot della readiness;
5. esegui `node --env-file=.env.local scripts/preflight.mjs`;
6. crea e verifica un backup;
7. registra il rilascio con `npm run release -- --version=1.0.0 --environment=production --status=deployed`.

Lo script di release rifiuta il deploy production quando manca un'approvazione valida.
