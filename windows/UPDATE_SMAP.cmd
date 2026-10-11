@echo off
set /p ZIPPATH=Percorso completo del nuovo pacchetto ZIP: 
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Update-SMAP.ps1" -PackageZip "%ZIPPATH%"
pause
