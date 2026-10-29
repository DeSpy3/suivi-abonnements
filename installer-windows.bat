@echo off
rem Mon budget - Copyright (c) 2026 Mael Sohier. Tous droits reserves. Voir LICENSE.
rem Double-clic pour installer Mon budget (aucun droit administrateur necessaire).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installation\installer-windows.ps1"
if errorlevel 1 pause
