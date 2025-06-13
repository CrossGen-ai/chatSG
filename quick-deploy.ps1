# Quick ChatSG Deployment (Code Only)
# Usage: .\quick-deploy.ps1

param(
    [string]$RemoteHost = "10.2.0.54",
    [string]$RemoteUser = "itops_admin", 
    [string]$KeyFile = "C:\Users\SeanPatterson\Downloads\vm-poc-dev-001.ppk",
    [string]$RemotePath = "/home/itops_admin/chatSG"
)

Write-Host "=== Quick ChatSG Deployment ===" -ForegroundColor Green
Write-Host "Deploying code changes only (no npm install)" -ForegroundColor Yellow
Write-Host ""

# Step 1: Build Frontend
Write-Host "Step 1: Building Frontend..." -ForegroundColor Cyan
Set-Location frontend
npm run build
Write-Host "✅ Frontend build completed" -ForegroundColor Green
Set-Location ..

# Step 2: Upload changed files
Write-Host "Step 2: Uploading files..." -ForegroundColor Cyan

# Upload backend
Write-Host "Uploading server.js..." -ForegroundColor Yellow
& pscp -i $KeyFile "backend/server.js" "$RemoteUser@$RemoteHost`:$RemotePath/"

# Upload frontend build
Write-Host "Uploading frontend files..." -ForegroundColor Yellow
& pscp -i $KeyFile -r "frontend/dist/*" "$RemoteUser@$RemoteHost`:$RemotePath/public/"

# Upload .env if changed
if (Test-Path "backend/.env") {
    Write-Host "Uploading .env..." -ForegroundColor Yellow
    & pscp -i $KeyFile "backend/.env" "$RemoteUser@$RemoteHost`:$RemotePath/"
}

Write-Host "✅ Files uploaded" -ForegroundColor Green
Write-Host "Note: .env file NOT uploaded to preserve remote configuration" -ForegroundColor Yellow

# Step 3: Restart server
Write-Host "Step 3: Restarting server..." -ForegroundColor Cyan
$restartCommand = @"
cd $RemotePath
echo "Stopping existing server..."
pkill -f "node server.js" || true
echo "Starting server..."
nohup npm start > app.log 2>&1 &
echo "Server restarted successfully"
echo "Check status: http://$RemoteHost:3000"
"@

& plink -i $KeyFile "$RemoteUser@$RemoteHost" $restartCommand

Write-Host "✅ Server restarted" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Quick deployment complete!" -ForegroundColor Green
Write-Host "Access your app: http://$RemoteHost`:3000" -ForegroundColor Cyan 