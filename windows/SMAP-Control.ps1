[CmdletBinding()]
param()

. (Join-Path $PSScriptRoot "Common.ps1")

function Pause-SmapMenu { Write-Host; Read-Host "Premi INVIO per continuare" | Out-Null }

:menu while ($true) {
  Clear-Host
  Write-Host "=====================================" -ForegroundColor Cyan
  Write-Host " SMAP Web 1.0 - Pannello Windows" -ForegroundColor Cyan
  Write-Host "=====================================" -ForegroundColor Cyan
  Write-Host "1. Installa / aggiorna"
  Write-Host "2. Avvia sviluppo e apri browser"
  Write-Host "3. Build e avvio produzione"
  Write-Host "4. Stato applicazione"
  Write-Host "5. Ferma applicazione"
  Write-Host "6. Crea e verifica backup"
  Write-Host "7. Apri cartella log"
  Write-Host "8. Registra avvio automatico"
  Write-Host "9. Rimuovi avvio automatico"
  Write-Host "10. Diagnostica e pacchetto supporto"
  Write-Host "11. Riparazione sicura"
  Write-Host "12. Controllo integrità dati"
  Write-Host "13. Aggiorna da pacchetto ZIP"
  Write-Host "14. Importa rete urbana reale di Alicante"
  Write-Host "0. Esci"
  Write-Host
  $choice = Read-Host "Scelta"

  try {
    switch ($choice) {
      "1" { & (Join-Path $PSScriptRoot "Install-SMAP.ps1"); Pause-SmapMenu }
      "2" { & (Join-Path $PSScriptRoot "Start-SMAP.ps1") -Mode development -OpenBrowser; Pause-SmapMenu }
      "3" { & (Join-Path $PSScriptRoot "Start-SMAP.ps1") -Mode production -Build -OpenBrowser; Pause-SmapMenu }
      "4" { & (Join-Path $PSScriptRoot "Status-SMAP.ps1"); Pause-SmapMenu }
      "5" { & (Join-Path $PSScriptRoot "Stop-SMAP.ps1"); Pause-SmapMenu }
      "6" { & (Join-Path $PSScriptRoot "Backup-SMAP.ps1") -Verify; Pause-SmapMenu }
      "7" { Initialize-SmapRuntimeDirectories; Start-Process explorer.exe $script:LogsDir }
      "8" { & (Join-Path $PSScriptRoot "Register-SMAP-Startup.ps1"); Pause-SmapMenu }
      "9" { & (Join-Path $PSScriptRoot "Unregister-SMAP-Startup.ps1"); Pause-SmapMenu }
      "10" { & (Join-Path $PSScriptRoot "Diagnose-SMAP.ps1") -OpenFolder; Pause-SmapMenu }
      "11" { & (Join-Path $PSScriptRoot "Repair-SMAP.ps1"); Pause-SmapMenu }
      "12" { Enter-SmapProject; & node.exe --env-file=.env.local scripts/data-integrity.mjs --no-fail; Pause-SmapMenu }
      "13" { $zip = Read-Host "Percorso completo del nuovo pacchetto ZIP"; & (Join-Path $PSScriptRoot "Update-SMAP.ps1") -PackageZip $zip; Pause-SmapMenu }
      "14" { & (Join-Path $PSScriptRoot "Import-Alicante-GTFS.ps1"); Pause-SmapMenu }
      "0" { break menu }
      default { Write-Warning "Scelta non valida."; Start-Sleep -Seconds 1 }
    }
  } catch {
    Write-Host "ERRORE: $($_.Exception.Message)" -ForegroundColor Red
    Pause-SmapMenu
  }
}
