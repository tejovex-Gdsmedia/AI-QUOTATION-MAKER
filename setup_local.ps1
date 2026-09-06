# Local Setup & Automation Bootstrap Script for Windows
# Run this script in PowerShell to configure and set up both the React frontend and Flask backend.

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " AI Proposal & Quotation SaaS Platform Setup " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Helper to check command availability
function Check-Command {
    param ([string]$name)
    $path = Get-Command $name -ErrorAction SilentlyContinue
    return $path -ne $null
}

# 1. Checking Core Runtimes
Write-Host "[1/5] Checking core runtime environments..." -ForegroundColor Yellow

if (Check-Command "node") {
    $nodeVer = node --version
    Write-Host "✔ Node.js is installed: $nodeVer" -ForegroundColor Green
} else {
    Write-Error "✖ Node.js is not found. Please install Node.js (v18+) from https://nodejs.org/ first."
    Exit 1
}

if (Check-Command "npm") {
    $npmVer = npm --version
    Write-Host "✔ NPM is installed: $npmVer" -ForegroundColor Green
} else {
    Write-Error "✖ NPM is not found."
    Exit 1
}

if (Check-Command "python") {
    $pyVer = python --version
    Write-Host "✔ Python is installed: $pyVer" -ForegroundColor Green
} else {
    Write-Error "✖ Python is not found. Please install Python (v3.9+) first."
    Exit 1
}

if (Check-Command "pip") {
    $pipVer = pip --version
    Write-Host "✔ Pip is installed: $pipVer" -ForegroundColor Green
} else {
    Write-Error "✖ Pip is not found."
    Exit 1
}
Write-Host ""

# 2. Creating Environment Variables
Write-Host "[2/5] Bootstrapping environment variables..." -ForegroundColor Yellow

# Frontend config setup
$feEnv = "frontend/.env"
if (Test-Path $feEnv) {
    Write-Host "✔ Frontend .env file already exists." -ForegroundColor Green
} else {
    Copy-Item "frontend/.env.example" $feEnv
    Write-Host "★ Created frontend/.env from example template. Please configure your Supabase keys." -ForegroundColor Magenta
}

# Backend config setup
$beEnv = "backend/.env"
if (Test-Path $beEnv) {
    Write-Host "✔ Backend .env file already exists." -ForegroundColor Green
} else {
    Copy-Item "backend/.env.example" $beEnv
    Write-Host "★ Created backend/.env from example template. Please configure your Database URL and Gemini key." -ForegroundColor Magenta
}
Write-Host ""

# 3. Installing Frontend dependencies
Write-Host "[3/5] Installing React-Vite frontend dependencies (npm install)..." -ForegroundColor Yellow
Push-Location frontend
try {
    npm install
    Write-Host "✔ Frontend dependencies successfully installed." -ForegroundColor Green
} catch {
    Write-Error "✖ Failed to install frontend dependencies."
    Pop-Location
    Exit 1
}
Pop-Location
Write-Host ""

# 4. Installing Backend dependencies
Write-Host "[4/5] Installing Flask backend dependencies (pip install)..." -ForegroundColor Yellow
Push-Location backend
try {
    pip install -r requirements.txt
    Write-Host "✔ Backend dependencies successfully installed." -ForegroundColor Green
} catch {
    Write-Error "✖ Failed to install backend dependencies."
    Pop-Location
    Exit 1
}
Pop-Location
Write-Host ""

# 5. Local Setup Complete Summary
Write-Host "=============================================" -ForegroundColor Green
Write-Host "           LOCAL SETUP COMPLETED!            " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Follow these manual steps to start services:" -ForegroundColor White
Write-Host "1. Configure 'frontend/.env' with Supabase credentials." -ForegroundColor White
Write-Host "2. Execute database tables in Supabase SQL editor using 'supabase/schema.sql'." -ForegroundColor White
Write-Host "3. Start the Flask backend API:" -ForegroundColor White
Write-Host "   cd backend; python app.py" -ForegroundColor Cyan
Write-Host "4. Start the React frontend client:" -ForegroundColor White
Write-Host "   cd frontend; npm run dev" -ForegroundColor Cyan
Write-Host ""
