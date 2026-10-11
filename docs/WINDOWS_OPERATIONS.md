# Operazioni Windows one-click

Lo Sprint 17 aggiunge un pacchetto operativo per Windows che non modifica lo schema PostgreSQL e resta compatibile con SMAP Web 1.0.

## Pannello principale

Per installare e avviare in una sola operazione usa:

```text
windows\SETUP_AND_START_SMAP.cmd
```

Per tutte le operazioni apri:

```text
windows\SMAP_CONTROL.cmd
```

Il pannello consente di:

- installare o aggiornare dipendenze, migrazioni, seed e test;
- avviare la modalità sviluppo;
- creare la build e avviare la modalità produzione;
- controllare processo e health check;
- fermare l'intero albero dei processi;
- creare e verificare un backup JSON;
- aprire i log;
- registrare o rimuovere l'avvio automatico all'accesso Windows.

## File principali

| File | Funzione |
|---|---|
| `Install-SMAP.ps1` | installazione e aggiornamento idempotente |
| `Initialize-PostgreSQL.ps1` | creazione/aggiornamento del ruolo e database locali |
| `Start-SMAP.ps1` | avvio development o production |
| `Stop-SMAP.ps1` | arresto dell'albero dei processi |
| `Status-SMAP.ps1` | stato processo e `/api/health` |
| `Backup-SMAP.ps1` | backup e verifica SHA-256 |
| `Register-SMAP-Startup.ps1` | attività pianificata all'accesso |
| `SMAP-Control.ps1` | menu interattivo |

## Installazione pulita

1. Installa Node.js LTS e PostgreSQL con Command Line Tools.
2. Esegui `windows\Initialize-PostgreSQL.ps1` in PowerShell.
3. Controlla `windows\.env.local.example`, poi esegui `windows\INSTALL_SMAP.cmd`.
4. Avvia con `windows\START_SMAP.cmd`.

La password PostgreSQL amministrativa viene richiesta come `SecureString` e non viene salvata dallo script.

## Avvio e log

L'avvio in background salva:

```text
logs\smap-web.out.log
logs\smap-web.err.log
```

PID, modalità e porta sono conservati nella cartella locale `.smap-runtime`, esclusa dal controllo versione.

## Modalità produzione

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File windows\Start-SMAP.ps1 -Mode production -Build -OpenBrowser
```

La prima esecuzione crea `.next`; quelle successive possono omettere `-Build` finché il codice non cambia.

## Avvio automatico

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File windows\Register-SMAP-Startup.ps1 -Mode production
```

Per rimuoverlo:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File windows\Unregister-SMAP-Startup.ps1
```

L'attività è registrata per l'utente Windows corrente e parte al login, non prima dell'accesso.

## Diagnostica

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File windows\Status-SMAP.ps1
Get-Content logs\smap-web.err.log -Tail 100
Get-Service *postgres*
```

Se lo stato mostra un processo attivo ma nessun health check, fermare SMAP, verificare il log errori e riavviare.

## Sprint 18 maintenance tools

The control panel now includes:

```text
10. Diagnostica e pacchetto supporto
11. Riparazione sicura
12. Controllo integrità dati
13. Aggiorna da pacchetto ZIP
```

Support bundles are written to `support-bundles/` and intentionally exclude `.env.local` values. Repair is non-destructive and creates a verified backup by default. Updates are installed side by side so the previous folder remains available for rollback.
