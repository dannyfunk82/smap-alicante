# SMAP Web — Sprint 5

## Obiettivo

Rendere la demo più immediata, accessibile, stabile e pronta per una presentazione pubblica.

## Funzioni realizzate

### Riepilogo iniziale

- stato generale del servizio;
- numero di bus operativi;
- conteggio preferiti;
- biglietti disponibili o attivi;
- notifiche non lette;
- prossimi autobus;
- azioni rapide per pianificazione, ricerca e biglietteria.

### Accessibilità persistente

Le preferenze sono salvate in PostgreSQL:

- contrasto elevato;
- riduzione delle animazioni;
- testo normale, grande o molto grande;
- notifiche di arrivo;
- notifiche dei biglietti;
- notifiche di servizio.

### Navigazione accessibile

- focus spostato sul titolo dopo il cambio sezione;
- `aria-current` nel menu;
- messaggi per screen reader;
- focus visibile rafforzato;
- chiusura del dettaglio fermata con `Esc`;
- scorciatoie da tastiera `Alt+1`–`Alt+5`.

### Esperienza responsive

- home adattata a desktop, tablet e smartphone;
- menu mobile scorrevole quando le sezioni non entrano nello schermo;
- schede metriche e azioni rapide adattive.

### Web app installabile

- manifest web;
- colore tema;
- icona SMAP;
- service worker nella build di produzione;
- cache dell'involucro statico senza memorizzare le API private.

### Qualità del dominio

Le regole tariffarie e le soglie di affollamento sono state centralizzate e coperte da test automatici.

## Migrazione database

`005_accessibility_quality.sql` aggiunge le preferenze utente e indici per biglietti e notifiche.
