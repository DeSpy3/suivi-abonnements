# Mon budget — Copyright (c) 2026 Maël Sohier. Tous droits réservés. Voir LICENSE.
#
# Installe Mon budget pour l'utilisateur courant, sans droits administrateur.
# Lancé par installer-windows.bat (double-clic). Installe Python 3.13 avec winget s'il manque.
$ErrorActionPreference = "Stop"

$Source = Split-Path -Parent $PSScriptRoot
$Dest = Join-Path $env:LOCALAPPDATA "MonBudget"
$App = Join-Path $Dest "app"
$Venv = Join-Path $Dest "venv"

function Info($texte) { Write-Host "==> $texte" -ForegroundColor Magenta }
function Echec($texte) {
    Write-Host "Erreur : $texte" -ForegroundColor Red
    Read-Host "Appuie sur Entrée pour fermer"
    exit 1
}

if (-not (Test-Path (Join-Path $Source "run.py"))) { Echec "lance l'installation depuis le dossier de Mon budget." }

# ---------- Python 3.11 ou plus récent ----------
function Test-Python($exe, [string[]]$options) {
    # Vrai si la commande lance un Python >= 3.11 (évite le faux python.exe du Microsoft Store)
    try {
        $sortie = & $exe @options -c "import sys; print(sys.version_info >= (3, 11))" 2>$null
        return ($LASTEXITCODE -eq 0 -and "$sortie".Trim() -eq "True")
    } catch { return $false }
}

function Find-Python {
    foreach ($version in "3.14", "3.13", "3.12", "3.11") {
        if ((Get-Command py -ErrorAction SilentlyContinue) -and (Test-Python "py" @("-$version"))) {
            return @{ Exe = "py"; Options = @("-$version") }
        }
    }
    $candidats = @("python") + (Get-ChildItem "$env:LOCALAPPDATA\Programs\Python\Python3*\python.exe" -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | ForEach-Object { $_.FullName })
    foreach ($exe in $candidats) {
        if (Test-Python $exe @()) { return @{ Exe = $exe; Options = @() } }
    }
    return $null
}

$Python = Find-Python
if (-not $Python) {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Start-Process "https://www.python.org/downloads/windows/"
        Echec "Python 3.11+ est nécessaire. Installe-le depuis la page qui vient de s'ouvrir (coche « Add python.exe to PATH »), puis relance l'installation."
    }
    Info "Installation de Python 3.13 (peut prendre quelques minutes)"
    winget install --exact --id Python.Python.3.13 --scope user --silent --accept-package-agreements --accept-source-agreements
    $Python = Find-Python
    if (-not $Python) { Echec "Python n'a pas pu être installé. Installe-le depuis python.org puis relance l'installation." }
}
Info ("Python utilisé : " + (& $Python.Exe @($Python.Options) --version))

# ---------- Copie de l'appli ----------
# Tes données (la base) sont dans un autre dossier : une réinstallation ne les touche pas
Info "Installation dans $Dest"
Get-Process pythonw -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$Venv*" } | Stop-Process -Force
if (Test-Path $App) { Remove-Item $App -Recurse -Force }
New-Item -ItemType Directory -Force -Path $App | Out-Null
foreach ($element in "app", "static", "scripts", "run.py", "requirements.txt", "LICENSE", "README.md", "CONFORMITE.md", "SECURITE.md") {
    $chemin = Join-Path $Source $element
    if (Test-Path $chemin) { Copy-Item $chemin -Destination $App -Recurse -Force }
}
Get-ChildItem $App -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
Copy-Item (Join-Path $PSScriptRoot "desinstaller-windows.ps1") -Destination (Join-Path $Dest "desinstaller.ps1") -Force

# ---------- Environnement Python isolé ----------
Info "Installation des dépendances (connexion Internet nécessaire)"
if (Test-Path $Venv) { Remove-Item $Venv -Recurse -Force }
& $Python.Exe @($Python.Options) -m venv $Venv
if ($LASTEXITCODE -ne 0) { Echec "création de l'environnement Python impossible." }
$PythonVenv = Join-Path $Venv "Scripts\python.exe"
& $PythonVenv -m pip install --disable-pip-version-check -q -r (Join-Path $App "requirements.txt")
if ($LASTEXITCODE -ne 0) { Echec "installation des dépendances impossible (vérifie ta connexion Internet)." }

$Logos = Join-Path $App "static\logos"
if (-not (Test-Path $Logos) -or -not (Get-ChildItem $Logos -ErrorAction SilentlyContinue)) {
    Info "Téléchargement des logos des services"
    & $PythonVenv (Join-Path $App "scripts\telecharger_logos.py") | Out-Null
}

# ---------- Raccourcis (Bureau et menu Démarrer) ----------
$Shell = New-Object -ComObject WScript.Shell
$Menu = Join-Path ([Environment]::GetFolderPath("Programs")) "Mon budget"
New-Item -ItemType Directory -Force -Path $Menu | Out-Null

function New-Raccourci($chemin, $cible, $arguments, $description) {
    $raccourci = $Shell.CreateShortcut($chemin)
    $raccourci.TargetPath = $cible
    $raccourci.Arguments = $arguments
    $raccourci.WorkingDirectory = $App
    $raccourci.IconLocation = Join-Path $App "static\icone.ico"
    $raccourci.Description = $description
    $raccourci.Save()
}

# pythonw : pas de fenêtre noire de console
$Pythonw = Join-Path $Venv "Scripts\pythonw.exe"
$Lancer = "`"" + (Join-Path $App "run.py") + "`""
New-Raccourci (Join-Path ([Environment]::GetFolderPath("Desktop")) "Mon budget.lnk") $Pythonw $Lancer "Suivi de ton budget"
New-Raccourci (Join-Path $Menu "Mon budget.lnk") $Pythonw $Lancer "Suivi de ton budget"
$Desinstaller = "-NoProfile -ExecutionPolicy Bypass -File `"" + (Join-Path $Dest "desinstaller.ps1") + "`""
New-Raccourci (Join-Path $Menu "Désinstaller Mon budget.lnk") "powershell.exe" $Desinstaller "Désinstaller Mon budget"

# ---------- Entrée dans « Applications installées » des Paramètres Windows ----------
$Version = (& $PythonVenv -c "import sys; sys.path.insert(0, r'$App'); import app; print(app.__version__)").Trim()
$Cle = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\MonBudget"
New-Item -Path $Cle -Force | Out-Null
$Valeurs = @{
    DisplayName = "Mon budget"; DisplayVersion = $Version; Publisher = "Maël Sohier"
    InstallLocation = $Dest; DisplayIcon = (Join-Path $App "static\icone.ico")
    UninstallString = "powershell.exe $Desinstaller"
}
foreach ($nom in $Valeurs.Keys) { Set-ItemProperty -Path $Cle -Name $nom -Value $Valeurs[$nom] }
Set-ItemProperty -Path $Cle -Name NoModify -Value 1 -Type DWord
Set-ItemProperty -Path $Cle -Name NoRepair -Value 1 -Type DWord

Info "Mon budget est installé."
Write-Host "  - Lance-le avec le raccourci « Mon budget » sur le Bureau ou dans le menu Démarrer."
Write-Host "  - Pour le désinstaller : Paramètres > Applications > Mon budget."
$Reponse = Read-Host "Lancer Mon budget maintenant ? [O/n]"
if ($Reponse -notmatch "^[nN]") { Start-Process $Pythonw -ArgumentList $Lancer -WorkingDirectory $App }
