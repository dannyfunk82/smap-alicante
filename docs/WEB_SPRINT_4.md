# SMAP Web Sprint 4

## Obiettivo

Rendere la demo controllabile durante una presentazione e simulare condizioni operative differenti senza modificare il codice.

## Funzioni

- ruolo `admin` nel profilo utente e nella sessione;
- pannello demo visibile solo agli amministratori;
- velocità globale della simulazione da 0,25× a 4×;
- pausa globale degli autobus;
- stato per ciascun autobus: in servizio, fermo, fuori servizio o GPS non disponibile;
- velocità individuale per autobus;
- affollamento automatico o imposto manualmente;
- generazione di un avviso di servizio;
- scadenza forzata dell'ultimo biglietto;
- ripristino completo della simulazione;
- stato del servizio normale, degradato o in pausa;
- esclusione dei mezzi non operativi dagli ETA e dal pianificatore.

## Sicurezza demo

Gli endpoint sotto `/api/admin/demo` richiedono una sessione con ruolo `admin`. Il ruolo è inserito nel cookie di sessione firmato; dopo l'aggiornamento è necessario fare logout e login.
