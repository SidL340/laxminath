@echo off
TITLE Nepal School ERP - Launcher
COLOR 0A
echo ===============================================================================
echo            STARTING SCHOOL MANAGEMENT SYSTEM & WEBSITE PORTAL
echo ===============================================================================
echo.
echo Launching Backend Server on port 5000...
start "School ERP Backend (Port 5000)" cmd /k "cd backend && npm run dev"

echo Launching Frontend Website & ERP on port 3000...
start "School ERP Frontend (Port 3000)" cmd /k "cd frontend && npm run dev"

echo.
echo Servers starting up!
echo Opening browser in 5 seconds...
timeout /t 5 >nul
start http://localhost:3000

echo.
echo System is running!
echo - Public School Website: http://localhost:3000
echo - ERP Login:              http://localhost:3000/login
echo - Backend API:           http://localhost:5000/api
echo.
echo To stop the servers, simply close the backend and frontend command windows.
pause
