#!/usr/bin/env bash
# ==============================================================================
# GridPulse UK - Application Startup Script
# Starts both FastAPI Backend (port 8000) and React Vite Frontend (port 5173)
# ==============================================================================

set -e

# Colors for terminal output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}          GridPulse UK - Renewable Procurement Platform        ${NC}"
echo -e "${CYAN}================================================================${NC}"

# Check for Python
if command -v python3 &>/dev/null; then
    PY_CMD="python3"
elif command -v python &>/dev/null; then
    PY_CMD="python"
else
    echo -e "${RED}[ERROR] Python is not installed or not in PATH.${NC}"
    exit 1
fi

# Check for Node / NPM
if ! command -v npm &>/dev/null; then
    echo -e "${RED}[ERROR] npm / Node.js is not installed or not in PATH.${NC}"
    exit 1
fi

echo -e "${GREEN}[INFO] Environment check passed:${NC}"
echo -e "  - Python: $($PY_CMD --version)"
echo -e "  - Node:   $(node --version)"
echo -e "  - npm:    $(npm --version)"

# Check if Docker compose mode is requested
if [ "$1" == "--docker" ]; then
    echo -e "\n${YELLOW}[INFO] Launching via Docker Compose...${NC}"
    docker compose up --build
    exit 0
fi

# Function to clean up background processes on exit
cleanup() {
    echo -e "\n${YELLOW}[INFO] Stopping GridPulse UK services...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo -e "${GREEN}[INFO] All services stopped. Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend Service
echo -e "\n${CYAN}>>> [1/2] Starting Python FastAPI Backend on port 8000...${NC}"
$PY_CMD -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait briefly for backend to initialize
sleep 2

# Verify Backend Health
if command -v curl &>/dev/null; then
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health || true)
    if [ "$HEALTH_STATUS" == "200" ]; then
        echo -e "${GREEN}[OK] Backend API is live and healthy.${NC}"
    else
        echo -e "${YELLOW}[WARN] Backend starting up (status: $HEALTH_STATUS)...${NC}"
    fi
fi

# 2. Start Frontend Service
echo -e "\n${CYAN}>>> [2/2] Starting React Vite Frontend on port 5173...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[INFO] Installing frontend node_modules...${NC}"
    npm install
fi

npm run dev &
FRONTEND_PID=$!
cd ..

sleep 2

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}   GridPulse UK is running successfully!                       ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "  - Frontend Dashboard: ${CYAN}http://localhost:5173${NC}"
echo -e "  - Backend REST API:   ${CYAN}http://localhost:8000${NC}"
echo -e "  - Swagger API Docs:   ${CYAN}http://localhost:8000/docs${NC}"
echo -e "  - Health Check:       ${CYAN}http://localhost:8000/api/health${NC}"
echo -e "----------------------------------------------------------------"
echo -e "Press ${YELLOW}[Ctrl + C]${NC} to gracefully stop all services."
echo -e "================================================================\n"

# Wait for both processes
wait
