# Go-live governance

## Obiettivo

Lo Sprint 13 introduce un gate operativo prima di una pubblicazione reale. Il punteggio non sostituisce le approvazioni aziendali: rende visibili controlli, evidenze e blocchi.

## Checklist

Gli elementi obbligatori coprono:

- segreti e sicurezza;
- backup e prova di ripristino;
- HTTPS e reverse proxy;
- monitoraggio e runbook incidenti;
- privacy e accessibilità;
- validazione del contratto dati AVANZA;
- piano di rollback.

Una voce completata dovrebbe includere un’evidenza verificabile, non soltanto una spunta.

## Feature flag

Ogni funzione può essere:

- attivata o disattivata;
- limitata a local, staging o production;
- rilasciata a una percentuale deterministica degli utenti.

Le sezioni biglietti, feedback, campagne e risultati vengono nascoste dal menu quando il flag non è attivo per l’utente.

## Retention

Le policy predefinite riguardano analytics, telemetria, audit, controlli e notifiche. La modalità predefinita è `dry_run`. L’esecuzione richiede la conferma `DELETE`.

Prima di ogni pulizia:

1. crea un backup;
2. verifica il checksum;
3. esegui l’anteprima;
4. controlla il numero di righe;
5. esegui la cancellazione soltanto dopo approvazione.

## Approvazioni

Un rilascio production con stato `deployed` richiede una decisione `approved` o `conditional` per la stessa versione. Una decisione `rejected` blocca lo script di release.

## Preflight

In produzione, `scripts/preflight.mjs` considera sia i requisiti tecnici sia la readiness del go-live. Un risultato `not_ready` rende il preflight non valido.
