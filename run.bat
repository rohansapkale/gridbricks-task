@echo off
REM ==============================================================================
REM GridPulse UK - Windows Batch Startup Script
REM ==============================================================================

echo ================================================================
echo           GridPulse UK - Renewable Procurement Platform        
echo ================================================================

REM Check Docker mode
if "%1"=="--docker" (
    echo [INFO] Launching with Docker Compose...
    docker compose up --build
    goto :eof
)

REM 1. Start Backend in separate window
echo [1/2] Starting Python FastAPI Backend on port 8000...
start "GridPulse Backend (Port 8000)" cmd /k "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"

REM 2. Start Frontend in separate window
echo [2/2] Starting React Vite Frontend on port 5173...
cd frontend
if not exist node_modules (
    echo [INFO] Installing frontend dependencies...
    call npm install
)
start "GridPulse Frontend (Port 5173)" cmd /k "npm run dev"
cd ..

echo ================================================================
echo    GridPulse UK services started in dedicated terminal windows!
echo ================================================================
echo    - Frontend Dashboard: http://localhost:5173
echo    - Backend API & Docs: http://localhost:8000/docs
echo    - Health Check:       http://localhost:8000/api/health
echo ================================================================
pause
