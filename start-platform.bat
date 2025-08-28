@echo off
echo ========================================
echo    DEPLOYMENT PLATFORM STARTER
echo ========================================
echo.

REM Check if running in correct directory
if not exist "deploymentapp\backendapp" (
    echo ERROR: Please run this from the Deployment Platform root directory!
    echo.
    pause
    exit /b 1
)

echo [1/4] Starting Redis with Docker...
echo ----------------------------------------
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Docker is not running or not installed!
    echo Please start Docker Desktop or install Docker.
    echo Continuing without Redis - build queue won't work.
    echo.
) else (
    docker run -d -p 6379:6379 --name deployment-redis redis >nul 2>&1
    if %errorlevel% equ 0 (
        echo Redis started successfully!
    ) else (
        echo Redis might already be running or port 6379 is in use.
    )
    echo.
)

echo [2/4] Starting Backend Server...
echo ----------------------------------------
cd deploymentapp\backendapp
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
)
if not exist .env (
    echo Creating .env from .env.example...
    copy .env.example .env >nul
    echo.
    echo IMPORTANT: Edit deploymentapp\backendapp\.env with your settings!
    echo.
)
echo Starting backend on http://localhost:3000
start "Backend Server" cmd /k npm start
cd ..\..
timeout /t 3 >nul

echo.
echo [3/4] Starting Frontend...
echo ----------------------------------------
cd deploymentapp\frontendapp
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)
echo Starting frontend on http://localhost:3001
start "Frontend Dev Server" cmd /k npm run dev
cd ..\..
timeout /t 3 >nul

echo.
echo [4/4] Starting Ngrok (Optional)...
echo ----------------------------------------
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Ngrok is not installed or not in PATH!
    echo.
    echo To install ngrok:
    echo 1. Download from: https://ngrok.com/download
    echo 2. Extract and add to PATH
    echo 3. Run: ngrok http 3000
    echo.
    echo Skipping ngrok - webhooks won't work without it.
) else (
    echo Starting ngrok tunnel...
    cd deploymentapp\backendapp
    start "Ngrok Tunnel" cmd /k node start-ngrok.js
    cd ..\..
)

echo.
echo ========================================
echo    PLATFORM STARTING UP!
echo ========================================
echo.
echo Frontend:   http://localhost:3001
echo Backend:    http://localhost:3000
echo Health:     http://localhost:3000/health
echo.
echo If using ngrok, check the ngrok window for your public URL.
echo.
echo Press any key to open the frontend in your browser...
pause >nul

start http://localhost:3001

echo.
echo All services started in separate windows.
echo Close this window when done.
echo.
pause