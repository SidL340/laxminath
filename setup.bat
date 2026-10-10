@echo off
TITLE Nepal School ERP - Automated Setup
COLOR 0B
echo ===============================================================================
echo            NEPAL SCHOOL MANAGEMENT SYSTEM & ERP - SETUP WIZARD
echo ===============================================================================
echo.
echo Step 1: Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend npm install failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Step 2: Generating Prisma Client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Prisma generate failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Step 3: Setting up Database Schema (db push)...
call npx prisma db push
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Database connection failed or database does not exist yet.
    echo Please verify your DATABASE_URL in backend\.env file!
    pause
)

echo.
echo Step 4: Seeding Initial School & Super Admin Account...
call node prisma/seed.js
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Database seed encountered an issue. You can re-run 'node prisma/seed.js' later.
)

echo.
echo Step 5: Installing frontend dependencies...
cd ..\frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend npm install failed!
    pause
    exit /b %ERRORLEVEL%
)

cd ..
echo.
echo ===============================================================================
echo                     SETUP COMPLETED SUCCESSFULLY!
echo ===============================================================================
echo.
echo  Default Login Credentials:
echo    Username: admin
echo    Password: Admin@123
echo.
echo  To start the system, simply double-click "start.bat"
echo  - Public School Website: http://localhost:3000
echo  - School ERP Login:      http://localhost:3000/login
echo.
echo ===============================================================================
pause
