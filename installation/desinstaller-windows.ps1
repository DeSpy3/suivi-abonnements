# Mon budget — Copyright (c) 2026 Maël Sohier. Tous droits réservés. Voir LICENSE.
# Désinstalle Mon budget. Tes données sont conservées, sauf si tu demandes à les supprimer.
$ErrorActionPreference = "Continue"

$Dest = Join-Path $env:LOCALAPPDATA "MonBudget"
$Venv = Join-Path $Dest "venv"
# Même dossier que platformdirs.user_data_dir("suivi-abonnements") sous Windows
$Base = Join-Path $env:LOCALAPPDATA "suivi-abonnements\suivi-abonnements"

Get-Process pythonw, python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$Venv*" } | Stop-Process -Force
Start-Sleep -Milliseconds 500

Remove-Item (Join-Path ([Environment]::GetFolderPath("Desktop")) "Mon budget.lnk") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path ([Environment]::GetFolderPath("Programs")) "Mon budget") -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\MonBudget" -Recurse -Force -ErrorAction SilentlyContinue
# Ce script tourne depuis le dossier à supprimer : on supprime tout sauf lui, puis lui en dernier
Get-ChildItem $Dest -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "desinstaller.ps1" } | Remove-Item -Recurse -Force
Write-Host "Mon budget est désinstallé." -ForegroundColor Magenta

if (Test-Path $Base) {
    Write-Host "Tes données (abonnements, dépenses, budgets) sont toujours dans : $Base"
    $Reponse = Read-Host "Les supprimer définitivement ? [o/N]"
    if ($Reponse -match "^[oO]") {
        Remove-Item (Split-Path $Base -Parent) -Recurse -Force
        Write-Host "Données supprimées."
    } else {
        Write-Host "Données conservées : une réinstallation les retrouvera."
    }
}
Read-Host "Appuie sur Entrée pour fermer"
Remove-Item $Dest -Recurse -Force -ErrorAction SilentlyContinue
