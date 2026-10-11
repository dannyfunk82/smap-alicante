# SMAP Web Sprint 9 — Pilot readiness

Versione 0.9.0.

## Obiettivo

Preparare SMAP a un pilot controllato con cittadini, introducendo consenso esplicito, analitica opzionale, feedback strutturato e strumenti amministrativi per trasformare le evidenze del pilot in decisioni di prodotto.

## Funzioni utente

- Centro Privacy bilingue.
- Consenso separato per analitica e partecipazione al pilot.
- Registro storico dei consensi.
- Esportazione JSON dei dati associati all'account.
- Richiesta di eliminazione dell'account, registrata per revisione.
- Form feedback con categoria, elemento correlato e valutazione da 1 a 5.
- Storico dei feedback e risposte del team.
- Avviso privacy e condizioni pubbliche prima della registrazione.

## Funzioni amministrative

- Cruscotto Pilot con partecipanti, utenti attivi, viaggi pianificati, biglietti demo e valutazione media.
- Trend aggregato di 14 giorni.
- Inbox feedback con workflow: new, reviewing, planned, resolved, closed.
- Risposta all'utente e notifica automatica.
- Esportazione CSV dei feedback.

## Privacy by design

L'analitica è disattivata per impostazione predefinita. Gli eventi sono registrati solo dopo consenso, sono limitati a una lista predefinita e le proprietà sono filtrate per impedire l'invio di strutture arbitrarie o dati estesi.

## Non incluso

- Invio di email reali.
- Cancellazione automatica dell'account senza revisione.
- Piattaforme analytics esterne.
- Segmentazione commerciale o profilazione.
