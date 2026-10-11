# Runbook operativo SMAP

## Controlli giornalieri

- apri `/status`;
- verifica `/api/health` e `/api/ready`;
- controlla il pannello Sistema;
- verifica l'età della telemetria esterna;
- controlla incidenti aperti e audit.

## Prima di ogni rilascio

1. backup PostgreSQL e JSON;
2. `npm.cmd run check`;
3. `scripts/preflight.mjs`;
4. migrazione database;
5. build;
6. avvio;
7. smoke test;
8. registrazione del deployment.

## Incidente

1. crea un incidente nel pannello Sistema;
2. imposta severità e messaggio bilingue;
3. abilita manutenzione se l'app non è utilizzabile;
4. raccogli request ID, log e audit;
5. applica correzione o rollback;
6. esegui smoke test;
7. marca l'incidente come risolto.

## Rollback

- ripristina il codice della release precedente;
- valuta se la migrazione è compatibile all'indietro;
- ripristina il database solo se strettamente necessario;
- registra la release con stato `rolled_back`;
- disattiva manutenzione quando health e readiness sono verdi.

## Release operations Sprint 14

1. creare il piano nel pannello **Releases**;
2. associare un backup verificato al punto di rollback;
3. completare backup, preflight e build;
4. iniziare il rollout;
5. registrare smoke test e osservazioni;
6. promuovere gradualmente oppure eseguire il rollback;
7. esportare il manifest Markdown e conservarlo con l’audit.
