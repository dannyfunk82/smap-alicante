# SMAP 1.0 — Catalogo API

Le API sono Route Handler Next.js sotto `/api`.

## Pubbliche

- `GET /api/health` — processo e database.
- `GET /api/ready` — readiness operativa.
- `GET /api/status` — stato pubblico e incidenti.
- `POST /api/auth/login` e `POST /api/auth/register`.

## Cittadino autenticato

- dashboard, rete, fermate, viaggi, biglietti, preferiti, notifiche;
- profilo, privacy, feedback, supporto, onboarding e campagne.

## Amministrazione

- demo, integrazioni, sistema, pilot, campagne e chiusura;
- go-live, release, continuità e handover.

Gli endpoint amministrativi richiedono una sessione con ruolo `admin`. Gli input vengono validati lato server e le azioni sensibili sono registrate in `audit_logs`.
