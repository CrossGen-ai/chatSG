# ChatSG Quick Update Script
# Usage: .\deploy-update.ps1
# For quick updates without full rebuild

param(
    [string]$RemoteHost = "10.2.0.54",
    [string]$RemoteUser = "itops_admin", 
    [string]$KeyFile = "C:\Users\SeanPatterson\Downloads\vm-poc-dev-001.ppk",
    [string]$RemotePath = "/home/itops_admin/chatSG",
    [switch]$BackendOnly = $false,
    [switch]$FrontendOnly = $false
)

Write-Host "=== ChatSG Quick Update Script ===" -ForegroundColor Green
Write-Host "Remote Host: $RemoteHost" -ForegroundColor Yellow
Write-Host "Remote User: $RemoteUser" -ForegroundColor Yellow
Write-Host "Remote Path: $RemotePath" -ForegroundColor Yellow
Write-Host ""

# Determine what to update
$updateBackend = -not $FrontendOnly
$updateFrontend = -not $BackendOnly

# Step 1: Build what's needed
if ($updateFrontend) {
    Write-Host "Building Frontend..." -ForegroundColor Cyan
    Set-Location frontend
    try {
        npm run build
        Write-Host "✅ Frontend build completed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Frontend build failed: $_" -ForegroundColor Red
        exit 1
    }
    Set-Location ..
}

if ($updateBackend) {
    Write-Host "Building Backend TypeScript..." -ForegroundColor Cyan
    Set-Location backend
    try {
        npm run build
        Write-Host "✅ Backend build completed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Backend build failed: $_" -ForegroundColor Red
        exit 1
    }
    Set-Location ..
}

# Step 2: Upload changed files
Write-Host "Uploading changes..." -ForegroundColor Cyan

if ($updateBackend) {
    Write-Host "Uploading backend files..." -ForegroundColor Yellow
    & pscp -i $KeyFile "backend/server.js" "${RemoteUser}@${RemoteHost}:$RemotePath/"
    & pscp -i $KeyFile -r "backend/dist" "${RemoteUser}@${RemoteHost}:$RemotePath/"
    & pscp -i $KeyFile -r "backend/src" "${RemoteUser}@${RemoteHost}:$RemotePath/"
}

if ($updateFrontend) {
    Write-Host "Uploading frontend files..." -ForegroundColor Yellow
    & pscp -i $KeyFile -r "frontend/dist/*" "${RemoteUser}@${RemoteHost}:$RemotePath/public/"
}

# Step 3: Restart services
Write-Host "Restarting services..." -ForegroundColor Cyan

$restartCommand = @"
cd $RemotePath
if command -v pm2 &> /dev/null; then
    echo "Restarting with PM2..."
    pm2 restart chatsg-backend
    pm2 status
else
    echo "PM2 not found. Please restart manually."
fi
"@

& plink -i $KeyFile "$RemoteUser@$RemoteHost" $restartCommand

Write-Host ""
Write-Host "✅ Update completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Updated components:" -ForegroundColor Yellow
if ($updateBackend) { Write-Host "  - Backend" -ForegroundColor White }
if ($updateFrontend) { Write-Host "  - Frontend" -ForegroundColor White }