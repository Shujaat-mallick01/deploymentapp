# Ngrok Setup Script for Deployment Platform
# This script helps configure ngrok for the deployment platform

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Platform - Ngrok Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if ngrok is installed
try {
    $ngrokVersion = ngrok version 2>$null
    Write-Host "✓ Ngrok is installed: $ngrokVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Ngrok is not installed" -ForegroundColor Red
    Write-Host "Please install ngrok from: https://ngrok.com/download" -ForegroundColor Yellow
    Write-Host "Or use: choco install ngrok (if you have Chocolatey)" -ForegroundColor Yellow
    exit 1
}

# Start ngrok for backend (port 3000)
Write-Host ""
Write-Host "Starting ngrok tunnel for backend (port 3000)..." -ForegroundColor Yellow
$ngrokProcess = Start-Process ngrok -ArgumentList "http 3000" -PassThru -WindowStyle Normal

# Wait for ngrok to start
Start-Sleep -Seconds 3

# Get ngrok URL from API
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -Method Get
    $publicUrl = $response.tunnels[0].public_url
    
    if ($publicUrl -like "http://*") {
        $publicUrl = $publicUrl -replace "http://", "https://"
    }
    
    Write-Host "✓ Ngrok tunnel created: $publicUrl" -ForegroundColor Green
    Write-Host ""
    
    # Update backend .env file
    $envPath = Join-Path $PSScriptRoot "backendapp\.env"
    $envContent = Get-Content $envPath -Raw
    
    # Update WEBHOOK_URL
    $envContent = $envContent -replace "WEBHOOK_URL=.*", "WEBHOOK_URL=$publicUrl/api/git/webhook"
    
    # Update GITHUB_CALLBACK_URL for production use
    $githubCallbackUrl = "$publicUrl/api/auth/github/callback"
    $envContent = $envContent -replace "GITHUB_CALLBACK_URL=.*", "GITHUB_CALLBACK_URL=$githubCallbackUrl"
    
    # Write updated content
    Set-Content -Path $envPath -Value $envContent -NoNewline
    Write-Host "✓ Updated backend .env with ngrok URLs" -ForegroundColor Green
    
    # Update frontend API configuration
    $frontendConfigPath = Join-Path $PSScriptRoot "frontendapp\src\config.ts"
    
    # Check if config.ts exists, if not create it
    if (!(Test-Path $frontendConfigPath)) {
        $configContent = @"
// API Configuration
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? '$publicUrl'
    : 'https://1xklqtdz-3000.uks1.devtunnels.ms';

export const config = {
    apiUrl: API_BASE_URL,
    githubOAuthUrl: `\${API_BASE_URL}/api/auth/github`,
    webhookUrl: `\${API_BASE_URL}/api/git/webhook`
};
"@
        Set-Content -Path $frontendConfigPath -Value $configContent
        Write-Host "✓ Created frontend config.ts with ngrok URL" -ForegroundColor Green
    } else {
        # Update existing config
        $configContent = Get-Content $frontendConfigPath -Raw
        $configContent = $configContent -replace "https://1xklqtdz-3000.uks1.devtunnels.ms", $publicUrl
        Set-Content -Path $frontendConfigPath -Value $configContent -NoNewline
        Write-Host "✓ Updated frontend config.ts with ngrok URL" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. GitHub OAuth App:" -ForegroundColor Yellow
    Write-Host "   - Go to: https://github.com/settings/developers" -ForegroundColor White
    Write-Host "   - Update your OAuth App's callback URL to:" -ForegroundColor White
    Write-Host "   $githubCallbackUrl" -ForegroundColor Green
    Write-Host ""
    Write-Host "2. GitHub Webhook:" -ForegroundColor Yellow
    Write-Host "   - Go to your repository settings → Webhooks" -ForegroundColor White
    Write-Host "   - Add webhook URL:" -ForegroundColor White
    Write-Host "   $publicUrl/api/git/webhook" -ForegroundColor Green
    Write-Host ""
    Write-Host "3. Public URLs:" -ForegroundColor Yellow
    Write-Host "   - Backend API: $publicUrl" -ForegroundColor Green
    Write-Host "   - Frontend: http://localhost:3001" -ForegroundColor Green
    Write-Host ""
    Write-Host "✓ Ngrok is running. Press Ctrl+C to stop." -ForegroundColor Green
    Write-Host "Dashboard: http://localhost:4040" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error getting ngrok URL. Make sure ngrok is running on port 3000" -ForegroundColor Red
    Write-Host "Run manually: ngrok http 3000" -ForegroundColor Yellow
}

# Keep script running
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")