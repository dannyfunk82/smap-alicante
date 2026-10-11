# SMAP Web Sprint 8

## Obiettivo

Portare la demo dalla fase di integrazione alla preparazione operativa per staging e produzione.

## Funzioni consegnate

- stato pubblico del servizio;
- modalità manutenzione;
- incidenti informativi, di avviso e critici;
- health, readiness e stato aggregato;
- request ID e identificazione versione/deployment nelle risposte;
- controlli amministrativi di database, integrazione, telemetria e segreti;
- registro dei rilasci;
- preflight e smoke test;
- output Next.js standalone;
- configurazioni Windows, nginx, systemd e Docker;
- backup esteso alle nuove tabelle.

## Criteri di completamento

- la migrazione `008` è applicabile in modo idempotente;
- il pannello Sistema è accessibile solo agli amministratori;
- `/status` è pubblico;
- `/api/ready` restituisce 503 quando lo schema necessario non è disponibile;
- preflight blocca la pubblicazione con database o segreti non validi;
- il registro release conserva versione, ambiente e deployment ID;
- i test del dominio e della policy release sono verdi.
