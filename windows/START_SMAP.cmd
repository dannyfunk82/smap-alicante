@echo off
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-SMAP.ps1" -Mode development -OpenBrowser
pause
