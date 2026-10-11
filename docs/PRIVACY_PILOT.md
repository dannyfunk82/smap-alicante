# Privacy e gestione del pilot

## Documenti e consensi

La migrazione `009_pilot_privacy_feedback.sql` crea documenti versionati e un registro append-only dei consensi. Il profilo utente mantiene lo stato corrente, mentre `user_consents` conserva lo storico.

Tipi di consenso:

- `privacy`: accettazione dell'avviso privacy;
- `terms`: accettazione delle condizioni della demo;
- `analytics`: analitica funzionale opzionale;
- `pilot`: partecipazione opzionale al pilot.

## Analitica

Gli eventi ammessi sono definiti in `lib/pilot-policy.js`. Il server controlla nuovamente il consenso prima di scrivere ogni evento. Le proprietà sono limitate a dieci valori primitivi, con nomi e lunghezze limitate.

## Esportazione dati

`GET /api/privacy/export` restituisce un file JSON con profilo, consensi, preferiti, biglietti, notifiche, feedback ed eventi analytics dell'utente. Non include hash password, cookie o segreti applicativi.

## Richiesta di eliminazione

`POST /api/privacy/delete-request` registra la richiesta e genera una notifica. Non elimina immediatamente l'account, così l'operatore può applicare la propria procedura verificata di conservazione e cancellazione.

## Feedback

Ogni utente può inviare al massimo cinque feedback per ora. Il testo deve contenere da 10 a 2.000 caratteri. Gli amministratori possono aggiornare stato e risposta; l'utente riceve una notifica.

## Pilot dashboard

La sezione amministrativa `Piloto` espone solamente metriche aggregate e una inbox operativa. L'export CSV è limitato agli amministratori autenticati.

Queste funzioni sono una base tecnica e non sostituiscono una revisione legale o organizzativa prima di un pilot reale.
