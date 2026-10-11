# Validation report — Sprint 19 Alicante Real Data

## Esito

- validazione struttura: superata;
- test automatici: 52 superati, 0 falliti;
- dry-run importatore GTFS: superato;
- sintassi degli script Node: superata;
- archivio senza `.env.local`, `node_modules` o `.next`;
- launcher Windows e attribuzione MITRAMS presenti.

## Dati supportati

- GTFS statico ufficiale UTE MIA;
- linee, fermate, corse, calendari, stop times e shapes;
- orari programmati nel dettaglio fermata;
- modalità ibrida con sei autobus simulati sulle linee reali.

## Limiti

Il feed GTFS reale non è incluso nello ZIP. Il download richiede una chiave Transitland oppure l'accesso al portale NAP. GPS, ritardi e affollamento non sono dati realtime ufficiali.
