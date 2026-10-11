# Architettura web-only

## Scelta

La nuova versione usa una sola applicazione Next.js. Le pagine e gli endpoint API sono nello stesso repository e nello stesso container.

```text
Browser
  └── Next.js web + API
        └── PostgreSQL
```

## Motivazione

- nessun SDK mobile;
- nessun progetto Flutter;
- nessun servizio API separato da avviare;
- stesso dominio per frontend, cookie e API;
- un solo comando Docker Compose;
- possibilità di evolvere in seguito verso servizi separati senza cambiare l'esperienza utente.

## Sicurezza Sprint 1

- hash password bcrypt;
- cookie di sessione HTTP-only;
- JWT firmato e con durata di 8 ore;
- query SQL parametrizzate;
- nessun dato personale nel client oltre al profilo della sessione;
- chiave Google Maps esposta solo come chiave browser, da limitare per dominio.

## Limiti deliberati

- recupero password e verifica email non sono ancora implementati;
- non è presente rate limiting;
- non è presente CSRF token esplicito, perché le mutazioni attuali sono same-site e la sessione usa SameSite=Lax; prima della produzione va aggiunta una protezione più completa;
- la rete e i nomi delle fermate sono fittizi.
