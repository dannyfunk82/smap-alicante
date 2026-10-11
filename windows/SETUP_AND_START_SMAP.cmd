@echo off
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-SMAP.ps1"
if errorlevel 1 goto error
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-SMAP.ps1" -Mode development -OpenBrowser
if errorlevel 1 goto error
exit /b 0
:error
echo.
echo Installazione o avvio non riusciti. Controlla il messaggio sopra.
pause
exit /b 1
