# Aggiornamento da Sprint 16 a Sprint 17 su Windows

Lo Sprint 17 non modifica il database. Aggiunge esclusivamente strumenti operativi Windows.

## 1. Ferma Sprint 16

Premi `Ctrl+C` nel terminale oppure chiudi il processo precedente.

## 2. Estrai il pacchetto

Estrai in:

```text
C:\dev\smap_web_sprint17
```

## 3. Copia la configurazione

```powershell
Copy-Item C:\dev\smap_web_sprint16\.env.local C:\dev\smap_web_sprint17\.env.local -Force
```

Se il file non viene trovato:

```powershell
$oldEnv = Get-ChildItem C:\dev\smap_web_sprint16 -Recurse -Force -Filter .env.local | Select-Object -First 1
Copy-Item $oldEnv.FullName C:\dev\smap_web_sprint17\.env.local -Force
```

## 4. Avvia il pannello

Doppio clic su:

```text
C:\dev\smap_web_sprint17\windows\SMAP_CONTROL.cmd
```

Seleziona prima **Installa / aggiorna**, poi **Avvia sviluppo e apri browser**.

## 5. Procedura PowerShell equivalente

```powershell
cd C:\dev\smap_web_sprint17
powershell.exe -NoProfile -ExecutionPolicy Bypass -File windows\Install-SMAP.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File windows\Start-SMAP.ps1 -OpenBrowser
```

## 6. Verifica

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File windows\Status-SMAP.ps1
```

L'output deve indicare `running: true` e includere la risposta dell'endpoint health.
