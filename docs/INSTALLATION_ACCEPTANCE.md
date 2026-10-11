# SMAP 1.0 — Installazione pulita e accettazione

1. Installare Node.js e PostgreSQL.
2. Creare ruolo e database `smap`.
3. Copiare `.env.example` in `.env.local` e impostare segreti locali.
4. Eseguire `npm.cmd install`.
5. Eseguire migrazioni e seed.
6. Eseguire `npm.cmd run check`.
7. Avviare con `npm.cmd run dev`.
8. Verificare `/api/health`, `/api/ready` e `/status`.
9. Eseguire `npm.cmd run acceptance`.
10. Verificare il rapporto in `reports/acceptance-report.md`.

L’accettazione è **passed** con punteggio almeno 90 e nessun controllo critico in errore; è **conditional** tra 70 e 89; altrimenti è **failed**.
