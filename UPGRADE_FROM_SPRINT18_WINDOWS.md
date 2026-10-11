# Aggiornamento da Sprint 18 a Sprint 19 — dati reali Alicante

1. Ferma SMAP.
2. Estrai il pacchetto in `C:\dev\smap_web_sprint19`.
3. Copia `.env.local` dallo Sprint 18.
4. Esegui:

```powershell
cd C:\dev\smap_web_sprint19
npm.cmd install
node --env-file=.env.local scripts/migrate.mjs
npm.cmd run check
```

5. Importa il GTFS reale:

```text
windows\IMPORT_ALICANTE_GTFS.cmd
```

6. Avvia l'app e accedi. Nel pannello Integraciones la sorgente `ute-mia-alicante` sarà attiva in modalità ibrida.
