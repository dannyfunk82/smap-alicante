# Operazioni di release SMAP

Lo Sprint 14 aggiunge un livello operativo tra la governance del go-live e il deployment tecnico.

## Modello

Ogni release dispone di:

- versione e deployment ID;
- ambiente: local, staging o production;
- strategia: canary, all-at-once o blue/green;
- percentuale di rollout;
- checklist ordinata di passi;
- osservazioni post-deploy;
- punti di rollback;
- richieste ed esecuzioni di rollback;
- audit delle azioni amministrative.

## Flusso consigliato

1. creare e verificare il backup;
2. eseguire il preflight;
3. costruire l’artefatto;
4. iniziare il deployment;
5. eseguire gli smoke test;
6. osservare errori, latenza e incidenti;
7. aumentare il rollout gradualmente;
8. completare oppure eseguire il rollback.

## Comandi

Stato dell’ultima release:

```powershell
node --env-file=.env.local scripts/release-status.mjs
```

Manifest Markdown:

```powershell
node --env-file=.env.local scripts/release-manifest.mjs
```

Preflight:

```powershell
node --env-file=.env.local scripts/preflight.mjs
```

## Rollback

L’esecuzione del rollback dal pannello:

- registra la motivazione;
- collega il punto di ripristino;
- marca il piano come `rolled_back`;
- marca il punto come utilizzato;
- registra l’evento nell’audit.

La demo non esegue comandi distruttivi sul sistema operativo. Il ripristino reale deve seguire il runbook di infrastruttura e il backup verificato.
