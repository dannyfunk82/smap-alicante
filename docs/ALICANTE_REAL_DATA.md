# SMAP — rete urbana reale di Alicante

## Fonte

SMAP usa il dataset GTFS statico **Autobuses urbanos de Alicante**, operatore UTE MIA, pubblicato nel Punto di Accesso Nazionale dei Trasporti.

- Scheda ufficiale: https://nap.transportes.gob.es/Files/Detail/1392
- Feed registrato: `f-autobuses~urbanos~de~alicante`
- Licenza: https://nap.transportes.gob.es/licencia-datos
- Attribuzione obbligatoria: **Powered by MITRAMS** con collegamento a https://www.transportes.gob.es/

Il feed statico contiene linee, fermate, corse, orari e geometrie. Non include un feed pubblico GTFS-Realtime per posizione GPS, ritardi o affollamento.

## Modalità ibrida

Dopo l'importazione:

- linee, fermate, sequenze e orari programmati sono reali;
- sei autobus continuano a essere simulati sulle linee reali;
- ETA dinamico e affollamento sono indicati come simulati;
- gli orari GTFS programmati sono mostrati nel dettaglio fermata;
- una futura API autorizzata può sostituire la simulazione.

## Importazione Windows

Eseguire:

```text
windows\IMPORT_ALICANTE_GTFS.cmd
```

Il programma permette di:

1. scaricare l'ultima versione tramite una chiave Transitland;
2. selezionare un file ZIP ottenuto dal portale NAP;
3. estrarre e validare il feed;
4. applicare la migrazione 019;
5. importare tutte le linee e gli orari;
6. attivare la modalità ibrida.

## Importazione manuale

```powershell
npm.cmd run alicante:import -- --dir C:\dati\alicante_gtfs --maxRoutes 100 --simulateBuses 6
```

Controllo stato:

```powershell
npm.cmd run alicante:status
```

## Aggiornamenti

Il feed può essere reimportato periodicamente. L'importatore aggiorna i dati della sorgente `ute-mia-alicante` senza ricreare il database o gli utenti.
