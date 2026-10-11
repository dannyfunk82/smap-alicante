# Web Sprint 1 — Criteri di completamento

- [x] progetto nuovo e indipendente;
- [x] solo browser web;
- [x] layout responsive desktop/mobile;
- [x] un unico servizio applicativo;
- [x] PostgreSQL;
- [x] migrazione automatica;
- [x] seed automatico;
- [x] registrazione;
- [x] login;
- [x] logout;
- [x] cookie HTTP-only;
- [x] 3 linee demo;
- [x] 30 fermate demo;
- [x] 6 autobus predisposti;
- [x] modalità mappa senza chiave;
- [x] Google Maps opzionale;
- [x] spagnolo e inglese nella dashboard;
- [x] controllo `/api/health`;
- [x] Docker Compose senza profili.

## Test manuale

1. `docker compose up --build`.
2. Aprire `/api/health`.
3. Accedere con l'account demo.
4. Verificare le tre linee e le trenta fermate.
5. Cambiare lingua ES/EN.
6. Uscire e creare un nuovo account.
7. Fermare e riavviare i container: l'account deve persistere.
