# ==============================================================================
# GridPulse UK - Windows PowerShell Startup Script
# ==============================================================================

param (
    [switch]$Docker
)

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "          GridPulse UK - Renewable Procurement Platform        " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

if ($Docker) {
    Write-Host "[INFO] Launching with Docker Compose..." -ForegroundColor Yellow
    docker compose up --build
    exit
}

# 1. Start Backend Job
Write-Host "`n>>> [1/2] Starting Python FastAPI Backend on port 8000..." -ForegroundColor Cyan
$BackendProcess = Start-Process python -ArgumentList "-m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000" -PassThru -NoNewWindow

Start-Sleep -Seconds 2

# 2. Start Frontend
Write-Host "`n>>> [2/2] Starting React Vite Frontend on port 5173..." -ForegroundColor Cyan
Set-Location frontend
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

$FrontendProcess = Start-Process npm -ArgumentList "run dev" -PassThru -NoNewWindow
Set-Location ..

Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "   GridPulse UK is running successfully!                       " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  - Frontend Dashboard: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  - Backend REST API:   http://localhost:8000" -ForegroundColor Cyan
Write-Host "  - Swagger API Docs:   http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  - Health Check:       http://localhost:8000/api/health" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------"
Write-Host "Press Ctrl + C or close this terminal window to stop."
Write-Host "================================================================`n"

try {
    Wait-Process -Id $BackendProcess.Id, $FrontendProcess.Id
} finally {
    Write-Host "`nStopping services..." -ForegroundColor Yellow
    Stop-Process -Id $BackendProcess.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $FrontendProcess.Id -ErrorAction SilentlyContinue
}
