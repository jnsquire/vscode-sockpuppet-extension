# Setup Two-Repository Structure
# Run this script to prepare the project for splitting into two GitHub repositories

param(
    [string]$PythonRepoUrl = "https://github.com/jnsquire/vscode-sockpuppet-python.git",
    [string]$ExtensionRepoUrl = "https://github.com/jnsquire/vscode-sockpuppet-extension.git"
)

Write-Host "=================================="
Write-Host "VSCode Sockpuppet - Two Repo Setup"
Write-Host "=================================="
Write-Host ""

# Step 1: Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "Please run this script from the vscode-sockpuppet directory"
    exit 1
}

Write-Host "[1/6] Checking prerequisites..."

# Check if Git is installed
try {
    git --version | Out-Null
    Write-Host "[OK] Git is installed" -ForegroundColor Green
} catch {
    Write-Error "Git is not installed. Please install Git first."
    exit 1
}

# Step 2: Backup current state
Write-Host ""
Write-Host "[2/6] Creating backup..."
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = "..\vscode-sockpuppet-backup-$timestamp"
Copy-Item -Recurse -Path "." -Destination $backupDir -Exclude @("node_modules", ".git", "dist")
Write-Host "[OK] Backup created at: $backupDir" -ForegroundColor Green

# Step 3: Prepare Python package for separate repo
Write-Host ""
Write-Host "[3/6] Preparing Python package..."

if (-not (Test-Path "python")) {
    Write-Error "Python folder not found!"
    exit 1
}

# Check if Python package has all necessary files
$pythonFiles = @(
    "python/pyproject.toml",
    "python/vscode_sockpuppet/__init__.py",
    "python/README_STANDALONE.md",
    "python/.gitignore",
    "python/LICENSE"
)

$missing = @()
foreach ($file in $pythonFiles) {
    if (-not (Test-Path $file)) {
        $missing += $file
    }
}

if ($missing.Count -gt 0) {
    Write-Warning "Missing files in Python package:"
    $missing | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host "[OK] Python package structure verified" -ForegroundColor Green

# Step 4: Show what will happen
Write-Host ""
Write-Host "[4/6] Repository Configuration"
Write-Host "================================"
Write-Host "Python Repository:"
Write-Host "  URL: $PythonRepoUrl"
Write-Host "  Location: python/ (will become submodule)"
Write-Host ""
Write-Host "Extension Repository:"
Write-Host "  URL: $ExtensionRepoUrl"
Write-Host "  Location: . (current directory)"
Write-Host ""

$confirm = Read-Host "Ready to proceed? (y/N)"
if ($confirm -ne "y") {
    Write-Host "Aborted." -ForegroundColor Yellow
    exit 0
}

# Step 5: Create instructions file
Write-Host ""
Write-Host "[5/6] Creating setup instructions..."

$instructionsContent = @"
# VSCode Sockpuppet - Repository Setup Instructions

## Current State

Your project is ready to be split into two repositories. A backup has been created.

## Next Steps

### Step 1: Create and Push Python Repository

Create the repository on GitHub first:
- Go to https://github.com/new
- Name: vscode-sockpuppet-python
- Create repository (do not initialize with README)

Then push the code:

``````powershell
# Create a temporary directory for the Python repo
cd ..
New-Item -ItemType Directory -Path vscode-sockpuppet-python-temp
cd vscode-sockpuppet-python-temp

# Copy Python package files
Copy-Item -Recurse ..\vscode-sockpuppet\python\* .

# Rename standalone README
Move-Item README_STANDALONE.md README.md

# Initialize Git
git init
git add .
git commit -m "Initial commit: Python package"

# Add remote and push
git remote add origin $PythonRepoUrl
git branch -M main
git push -u origin main
``````

### Step 2: Convert Python Folder to Submodule

``````powershell
# Go back to extension directory
cd ..\vscode-sockpuppet

# Remove python folder (it's backed up!)
Remove-Item -Recurse -Force python

# Add as submodule
git submodule add $PythonRepoUrl python

# Commit
git add .gitmodules python
git commit -m "Convert Python package to submodule"
``````

### Step 3: Push Extension Repository

Create the extension repository on GitHub:
- Go to https://github.com/new
- Name: vscode-sockpuppet-extension
- Create repository (do not initialize with README)

Then push:

``````powershell
# Add remote and push
git remote add origin $ExtensionRepoUrl
git branch -M main
git push -u origin main
``````

### Step 4: Verify Setup

``````powershell
# Clone extension with submodule
cd ..
git clone --recursive $ExtensionRepoUrl vscode-sockpuppet-test
cd vscode-sockpuppet-test

# Verify structure
Get-ChildItem python\

# Test extension
npm install
npm run compile

# Test Python package
cd python
pip install -e .
python example.py
``````

## Backup Location

Your original files are backed up at:
$backupDir

## Repository URLs

- Python: $PythonRepoUrl
- Extension: $ExtensionRepoUrl

## Documentation

See docs/TWO_REPO_SETUP.md for complete guide.
"@

$instructionsContent | Set-Content -Path "SETUP_INSTRUCTIONS.txt" -Encoding UTF8
Write-Host "[OK] Instructions written to SETUP_INSTRUCTIONS.txt" -ForegroundColor Green

# Step 6: Summary
Write-Host ""
Write-Host "[6/6] Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Read SETUP_INSTRUCTIONS.txt"
Write-Host "2. Create GitHub repositories"
Write-Host "3. Follow the instructions to push code"
Write-Host ""
Write-Host "Your backup is at: $backupDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "Documentation: docs/TWO_REPO_SETUP.md"
Write-Host ""
