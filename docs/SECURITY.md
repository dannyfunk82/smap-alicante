# Sicurezza SMAP Web

## Autenticazione

- cookie di sessione HTTP-only;
- durata sessione: 8 ore;
- `SameSite=Lax`;
- cookie `Secure` in produzione quando `FORCE_HTTPS=true`;
- sessioni invalidabili tramite `session_version`.

## Password

Per registrazione e cambio password sono richiesti:

- almeno 10 caratteri;
- una lettera maiuscola;
- una lettera minuscola;
- un numero;
- un simbolo.

Le password sono memorizzate con bcrypt, costo 12.

## Protezione accessi

- blocco account dopo 5 errori consecutivi;
- durata blocco: 15 minuti;
- massimo 20 tentativi falliti per IP in 15 minuti;
- registrazione dei tentativi in `auth_attempts`.

## Audit

La tabella `audit_logs` registra:

- login riusciti e falliti;
- logout e registrazioni;
- cambio password;
- acquisto e attivazione biglietti;
- modifiche alla simulazione;
- esportazione del registro.

## Pubblicazione

Prima di pubblicare:

1. usa una `AUTH_SECRET` casuale di almeno 32 caratteri;
2. imposta `FORCE_HTTPS=true` dietro HTTPS;
3. limita l'accesso al database;
4. non pubblicare `.env.local` o i backup;
5. configura backup PostgreSQL esterni;
6. verifica CSP e Google Maps nel dominio definitivo;
7. aggiungi logging e alert centralizzati.
