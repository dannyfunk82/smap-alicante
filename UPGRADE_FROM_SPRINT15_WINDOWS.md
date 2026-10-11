# Aggiornamento da Sprint 15 a SMAP 1.0

1. Ferma Sprint 15 con `Ctrl+C`.
2. Estrai lo ZIP in `C:\dev\smap_web_sprint16`.
3. Copia `.env.local` dallo Sprint 15.
4. Esegui `npm.cmd install`.
5. Esegui `node --env-file=.env.local scripts/migrate.mjs`.
6. Esegui `node --env-file=.env.local scripts/seed.mjs`.
7. Esegui `npm.cmd run check`.
8. Avvia con `npm.cmd run dev`.
9. Effettua logout/login e apri **Entrega / Handover**.
10. Esegui `npm.cmd run acceptance` e conserva il rapporto.
