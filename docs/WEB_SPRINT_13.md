# Web Sprint 13 — Pre-produzione e go-live

## Risultato

La piattaforma passa da demo/pilot chiuso a base governata per una fase pre-produzione. Lo sprint non collega automaticamente sistemi AVANZA reali e non costituisce autorizzazione al lancio pubblico.

## Incrementi

- migrazione `013_go_live_governance.sql`;
- pannello `GoLivePanel`;
- API amministrative `/api/admin/go-live/*`;
- feature flag esposte da `/api/config`;
- policy di rollout e readiness testabili;
- pulizia dati controllata;
- approvazioni e contatti di escalation;
- preflight e release gate aggiornati;
- backup esteso.
