# Aggiornamento da SMAP Web Sprint 1 — Windows, senza Docker

## 1. Ferma la versione corrente
Nel terminale di Next.js premi `Ctrl+C`.

## 2. Estrai il nuovo ZIP
Estrai `smap_web_sprint2.zip` in:

```text
C:\dev\smap_web_sprint2
```

## 3. Copia la configurazione già funzionante

```powershell
Copy-Item C:\dev\smap_web_sprint1\.env.local C:\dev\smap_web_sprint2\.env.local
cd C:\dev\smap_web_sprint2
```

## 4. Installa le dipendenze

```powershell
npm.cmd install
```

## 5. Applica soltanto la nuova migrazione

```powershell
node --env-file=.env.local scripts/migrate.mjs
```

L'output deve includere:

```text
Applied migration: 002_features.sql
```

## 6. Aggiorna i dati demo

```powershell
node --env-file=.env.local scripts/seed.mjs
```

## 7. Avvia

```powershell
npm.cmd run dev
```

Apri `http://localhost:3000` e usa:

- Email: `demo@smap.local`
- Password: `SmapDemo2026`

## Funzioni disponibili

- sei autobus simulati in movimento;
- ETA alla prossima fermata;
- affollamento basso, medio o alto;
- ricerca linee e fermate;
- preferiti persistenti;
- acquisto simulato per tratta;
- biglietti con QR code;
- attivazione e cronologia;
- spagnolo e inglese;
- alto contrasto, testo grande e riduzione animazioni.
