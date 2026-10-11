# SMAP Web Sprint 6

## Obiettivo

Rendere la demo più sicura e amministrabile, predisponendola alla pubblicazione controllata.

## Funzioni consegnate

- policy password per nuovi account e cambio password;
- blocco per 15 minuti dopo 5 accessi falliti;
- limitazione per IP dei tentativi di autenticazione;
- contatore versione sessione per invalidare cookie esistenti;
- cambio password con logout automatico di tutte le sessioni;
- audit di login, logout, registrazione, biglietti e azioni demo;
- dashboard amministrativa Operazioni;
- esportazione CSV degli ultimi 5.000 eventi;
- health check con versione, timestamp e latenza DB;
- header CSP, anti-framing, anti-MIME-sniffing e permissions policy;
- backup JSON e checksum SHA-256;
- test automatici della sicurezza.

## Limiti della demo

- il rate limiting è memorizzato in PostgreSQL e non sostituisce un reverse proxy/WAF;
- la CSP consente `unsafe-inline` e `unsafe-eval` per compatibilità con Next.js in sviluppo;
- il backup JSON contiene dati sensibili e deve restare locale;
- prima della pubblicazione reale servono HTTPS, segreti gestiti esternamente e monitoraggio centralizzato.
