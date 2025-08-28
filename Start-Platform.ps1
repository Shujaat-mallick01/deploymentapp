# Deployment Platform Starter Script
# Run with: .\Start-Platform.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   DEPLOYMENT PLATFORM STARTER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if in correct directory
if (-not (Test-Path "deploymentapp\backendapp")) {
    Write-Host "ERROR: Please run this from the Deployment Platform root directory!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Function to check if port is in use
function Test-Port {
    param($Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
    return $connection
}

# Step 1: Check and start Redis
Write-Host "[1/5] Checking Redis..." -ForegroundColor Yellow
$redisRunning = Test-Port -Port 6379
if ($redisRunning) {
    Write-Host "✓ Redis is already running on port 6379" -ForegroundColor Green
} else {
    # Check if Docker is available
    try {
        docker --version | Out-Null
        Write-Host "Starting Redis with Docker..." -ForegroundColor Gray
        docker run -d -p 6379:6379 --name deployment-redis redis 2>$null
        if ($?) {
            Write-Host "✓ Redis started successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠ Redis container might already exist. Trying to start it..." -ForegroundColor Yellow
            docker start deployment-redis 2>$null
        }
    } catch {
        Write-Host "⚠ Docker not found. Please install Docker or Redis manually." -ForegroundColor Yellow
        Write-Host "  The platform will run but build queue won't work." -ForegroundColor Gray
    }
}
Write-Host ""

# Step 2: Setup Backend
Write-Host "[2/5] Setting up Backend..." -ForegroundColor Yellow
Set-Location "deploymentapp\backendapp"

# Check for node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Gray
    npm install
}

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env from .env.example..." -ForegroundColor Gray
    Copy-Item ".env.example" ".env"
    Write-Host "⚠ IMPORTANT: Edit deploymentapp\backendapp\.env with your settings!" -ForegroundColor Yellow
}

# Start backend
Write-Host "Starting backend server on http://localhost:3000" -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start" -WindowStyle Normal

Set-Location "..\..\"
Start-Sleep -Seconds 2
Write-Host ""

# Step 3: Setup Frontend
Write-Host "[3/5] Setting up Frontend..." -ForegroundColor Yellow
Set-Location "deploymentapp\frontendapp"

# Check for node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
    npm install
}

# Start frontend
Write-Host "Starting frontend on http://localhost:3001" -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal

Set-Location "..\..\"
Start-Sleep -Seconds 2
Write-Host ""

# Step 4: Check MongoDB
Write-Host "[4/5] Checking MongoDB..." -ForegroundColor Yellow
$mongoRunning = Test-Port -Port 27017
if ($mongoRunning) {
    Write-Host "✓ MongoDB is running on port 27017" -ForegroundColor Green
} else {
    Write-Host "⚠ MongoDB is not running!" -ForegroundColor Yellow
    Write-Host "  Options:" -ForegroundColor Gray
    Write-Host "  1. Use MongoDB Atlas (FREE): https://www.mongodb.com/cloud/atlas" -ForegroundColor Gray
    Write-Host "  2. Install local MongoDB: https://www.mongodb.com/try/download/community" -ForegroundColor Gray
    Write-Host "  3. Run with Docker: docker run -d -p 27017:27017 mongo" -ForegroundColor Gray
}
Write-Host ""

# Step 5: Setup Ngrok
Write-Host "[5/5] Setting up Ngrok..." -ForegroundColor Yellow
$ngrokPath = Get-Command ngrok -ErrorAction SilentlyContinue
if ($ngrokPath) {
    Write-Host "Starting ngrok tunnel..." -ForegroundColor Gray
    Set-Location "deploymentapp\backendapp"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "node start-ngrok.js" -WindowStyle Normal
    Set-Location "..\..\"
    Write-Host "✓ Ngrok helper started - check the window for your public URL" -ForegroundColor Green
} else {
    Write-Host "⚠ Ngrok not found!" -ForegroundColor Yellow
    Write-Host "  To enable webhooks:" -ForegroundColor Gray
    Write-Host "  1. Download from: https://ngrok.com/download" -ForegroundColor Gray
    Write-Host "  2. Extract and add to PATH" -ForegroundColor Gray
    Write-Host "  3. Run: ngrok http 3000" -ForegroundColor Gray
    Write-Host "  Webhooks won't work without ngrok." -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   PLATFORM IS STARTING UP!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  Frontend:    http://localhost:3001" -ForegroundColor White
Write-Host "  Backend API: http://localhost:3000" -ForegroundColor White
Write-Host "  Health Check: http://localhost:3000/health" -ForegroundColor White

# Check if ngrok is running and provide URL
if ($ngrokPath) {
    Write-Host ""
    Write-Host "  Ngrok Inspector: http://127.0.0.1:4040" -ForegroundColor White
    Write-Host ""
    Write-Host "Check the ngrok window for your public webhook URL!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Waiting for services to start..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Test backend health
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Backend is healthy!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠ Backend might still be starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Opening frontend in browser..." -ForegroundColor Gray
Start-Process "http://localhost:3001"

Write-Host ""
Write-Host "All services started in separate windows." -ForegroundColor Green
Write-Host "Press Enter to exit this window (services will keep running)..." -ForegroundColor Gray
Read-Host