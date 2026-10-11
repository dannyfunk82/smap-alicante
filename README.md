# SMAP Web — Alicante Real Data Pack (Sprint 19)

Questa versione aggiunge l'importazione del GTFS statico ufficiale della rete urbana di Alicante. Linee, fermate, sequenze e orari programmati diventano reali; posizione GPS, ETA dinamico e affollamento restano simulati fino alla disponibilità di un feed realtime autorizzato.

Avvio rapido: `windows\IMPORT_ALICANTE_GTFS.cmd`.

Fonte e attribuzione: **Powered by MITRAMS** — https://www.transportes.gob.es/

# SMAP Web 1.0.0 — Maintenance and Windows Operations Pack

Smart Mobility Alicante Platform è una web app responsive dimostrativa per il trasporto pubblico di Alicante. Include dati autobus simulati ed esterni, ETA, affollamento, pianificazione, biglietteria demo con QR, accessibilità, privacy, pilot, governance, release e continuità operativa.


## Sprint 18: manutenzione a lungo termine

Questa distribuzione aggiunge strumenti non distruttivi per mantenere e supportare l’installazione Windows:

- controllo integrità database con report JSON/Markdown;
- pacchetto diagnostico ZIP senza segreti;
- riparazione sicura con backup verificato;
- aggiornamento affiancato da ZIP con controllo SHA-256;
- nuove opzioni nel pannello Windows.

Apri `windows\SMAP_CONTROL.cmd` e usa le opzioni 10–13. Consulta `START_HERE_WINDOWS_MAINTENANCE.md` e `docs/LONG_TERM_MAINTENANCE.md`. Non è prevista una migrazione database 018.

## Sprint 17: gestione Windows one-click

Questa distribuzione aggiunge un pannello operativo per Windows senza modificare lo schema del database:

- installazione e aggiornamento guidati;
- avvio development o production in background;
- stato, health check e log;
- arresto dell’intero albero dei processi;
- backup con verifica SHA-256;
- inizializzazione assistita di PostgreSQL;
- avvio automatico opzionale tramite Task Scheduler.

Per installare e avviare direttamente, apri con doppio clic:

```text
windows\SETUP_AND_START_SMAP.cmd
```

Per il menu completo usa `windows\SMAP_CONTROL.cmd`.

Consulta `START_HERE_WINDOWS_ONE_CLICK.md` e `docs/WINDOWS_OPERATIONS.md`.

## Sprint 16: handover finale

La nuova area **Entrega / Handover** consolida:

- checklist di consegna con responsabili ed evidenze;
- stato di revisione della documentazione;
- prove di accettazione registrate;
- catalogo API e dizionario dati;
- report Markdown e JSON;
- verifica di installazione pulita.

## Avvio locale su Windows

```powershell
cd C:\dev\smap_web_sprint18
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
node --env-file=.env.local scripts/seed.mjs
npm.cmd run check
npm.cmd run dev
```

Apri `http://localhost:3000`.

Account demo:

```text
Email: demo@smap.local
Password: SmapDemo2026
```

## Accettazione finale

```powershell
npm.cmd run acceptance
npm.cmd run handover:report
```

I rapporti vengono creati in `reports/`. Consulta `docs/HANDOVER.md` e `UPGRADE_FROM_SPRINT15_WINDOWS.md`.
