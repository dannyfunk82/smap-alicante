# Web Sprint 17 — Windows Operations Pack

## Obiettivo

Ridurre al minimo i comandi manuali necessari per usare SMAP Web 1.0 su un PC Windows, mantenendo PostgreSQL e Node.js installati localmente.

## Incremento

- menu interattivo per le operazioni più comuni;
- launcher `.cmd` utilizzabili con doppio clic;
- installazione e aggiornamento idempotente;
- inizializzazione assistita di PostgreSQL;
- avvio in background development/production;
- PID e arresto dell'albero dei processi;
- health check e stato JSON;
- log persistenti;
- backup verificato;
- attività pianificata opzionale all'accesso Windows.

## Compatibilità

Non è presente una migrazione `017`: lo schema resta quello della release 1.0.0 e della migrazione `016_handover_acceptance.sql`.

## Limiti

- Node.js e PostgreSQL devono essere installati separatamente;
- la sintassi PowerShell è progettata per Windows PowerShell 5.1 e PowerShell 7;
- l'avvio automatico usa Task Scheduler e avviene dopo il login dell'utente;
- per un servizio Windows prima del login è preferibile una soluzione amministrata da IT.
