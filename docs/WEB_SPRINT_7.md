# SMAP Web Sprint 7

## Obiettivo

Predisporre SMAP per la sostituzione graduale dei dati simulati con dati forniti da AVANZA o da un altro operatore.

## Consegnato

- migrazione `007_external_integrations.sql`;
- fonti di integrazione e storico sincronizzazioni;
- campi `source_id` ed `external_id` su linee, fermate e autobus;
- archivio delle posizioni esterne;
- importatore GTFS da cartella estratta;
- endpoint telemetria protetto da chiave;
- simulatore di telemetria esterna;
- modalità demo, ibrida ed esterna;
- fallback automatico configurabile;
- indicazione visiva della sorgente dati;
- pannello amministrativo `Integraciones`;
- inclusione delle nuove tabelle nel backup;
- test delle regole di selezione sorgente e freschezza.

## Non incluso

- accesso a endpoint privati AVANZA;
- GTFS-Realtime protobuf;
- pagamenti reali;
- pianificazione con cambi;
- validazione completa di tutti i casi GTFS.
