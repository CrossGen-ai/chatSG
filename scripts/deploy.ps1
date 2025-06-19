# ChatSG Deployment Script
# Usage: .\deploy.ps1

param(
    [string]$RemoteHost = "10.2.0.54",
    [string]$RemoteUser = "itops_admin", 
    [string]$KeyFile = "C:\Users\SeanPatterson\Downloads\vm-poc-dev-001.ppk",
    [string]$RemotePath = "/home/itops_admin/chatSG",
    [switch]$UploadEnv = $false  # Only upload .env if explicitly requested
)

Write-Host "=== ChatSG Deployment Script ===" -ForegroundColor Green
Write-Host "Remote Host: $RemoteHost" -ForegroundColor Yellow
Write-Host "Remote User: $RemoteUser" -ForegroundColor Yellow
Write-Host "Remote Path: $RemotePath" -ForegroundColor Yellow
Write-Host ""

# Step 1: Build Frontend
Write-Host "Step 1: Building Frontend..." -ForegroundColor Cyan
Set-Location frontend
try {
    npm run build
    Write-Host "✅ Frontend build completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend build failed: $_" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Step 2: Create deployment package
Write-Host "Step 2: Creating deployment package..." -ForegroundColor Cyan
$deployDir = "deploy-package"
if (Test-Path $deployDir) {
    Remove-Item $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

# Copy backend files
Copy-Item "backend/server.js" "$deployDir/"
Copy-Item "backend/package.json" "$deployDir/"
Copy-Item "backend/.env" "$deployDir/" -ErrorAction SilentlyContinue

# Copy frontend build
Copy-Item "frontend/dist" "$deployDir/public" -Recurse

# Create deployment info
@"
# ChatSG Deployment
Deployed: $(Get-Date)
Frontend: Built from React + Vite
Backend: Node.js + Express
Environment: Check .env file for ENVIRONMENT variable
"@ | Out-File "$deployDir/DEPLOYMENT_INFO.txt"

Write-Host "✅ Deployment package created" -ForegroundColor Green

# Step 3: Upload to remote server
Write-Host "Step 3: Uploading to remote server..." -ForegroundColor Cyan

# Create remote directory
Write-Host "Creating remote directory..." -ForegroundColor Yellow
& plink -i $KeyFile "$RemoteUser@$RemoteHost" "mkdir -p $RemotePath"

# Upload files
Write-Host "Uploading backend files..." -ForegroundColor Yellow
& pscp -i $KeyFile "$deployDir/server.js" "$RemoteUser@$RemoteHost`:$RemotePath/"
& pscp -i $KeyFile "$deployDir/package.json" "$RemoteUser@$RemoteHost`:$RemotePath/"

# Upload .env if it exists
if (Test-Path "$deployDir/.env" -and $UploadEnv) {
    Write-Host "Uploading .env file..." -ForegroundColor Yellow
    & pscp -i $KeyFile "$deployDir/.env" "$RemoteUser@$RemoteHost`:$RemotePath/"
}

# Upload frontend build
Write-Host "Uploading frontend files..." -ForegroundColor Yellow
& pscp -i $KeyFile -r "$deployDir/public" "$RemoteUser@$RemoteHost`:$RemotePath/"

# Upload deployment info
& pscp -i $KeyFile "$deployDir/DEPLOYMENT_INFO.txt" "$RemoteUser@$RemoteHost`:$RemotePath/"

Write-Host "✅ Files uploaded successfully" -ForegroundColor Green
if (-not $UploadEnv) {
    Write-Host "Note: .env file NOT uploaded to preserve remote configuration" -ForegroundColor Yellow
    Write-Host "Use -UploadEnv flag if you want to overwrite remote .env" -ForegroundColor Yellow
}

# Step 4: Install dependencies and start services
Write-Host "Step 4: Installing dependencies on remote server..." -ForegroundColor Cyan

$remoteCommands = @"
cd $RemotePath
echo "Installing Node.js dependencies..."
npm install
echo "Dependencies installed successfully"
echo ""
echo "=== Deployment Complete ==="
echo "Backend files: $RemotePath/server.js"
echo "Frontend files: $RemotePath/public/"
echo "To start the server: cd $RemotePath && npm start"
echo "Server will run on: http://localhost:3000"
echo ""
echo "Environment check:"
if [ -f .env ]; then
    echo "Environment file found:"
    cat .env
else
    echo "No .env file found - will use production mode"
fi
"@

Write-Host "Running remote installation commands..." -ForegroundColor Yellow
& plink -i $KeyFile "$RemoteUser@$RemoteHost" $remoteCommands

# Step 5: Cleanup
Write-Host "Step 5: Cleaning up..." -ForegroundColor Cyan
Remove-Item $deployDir -Recurse -Force
Write-Host "✅ Cleanup completed" -ForegroundColor Green

Write-Host ""
Write-Host "=== Deployment Summary ===" -ForegroundColor Green
Write-Host "✅ Frontend built and deployed to: $RemotePath/public/" -ForegroundColor Green
Write-Host "✅ Backend deployed to: $RemotePath/server.js" -ForegroundColor Green
Write-Host "✅ Dependencies installed on remote server" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. SSH to the server: ssh -i $KeyFile $RemoteUser@$RemoteHost" -ForegroundColor White
Write-Host "2. Navigate to app: cd $RemotePath" -ForegroundColor White
Write-Host "3. Start the server: npm start" -ForegroundColor White
Write-Host "4. Access the app: http://$RemoteHost`:3000" -ForegroundColor White
Write-Host ""
Write-Host "To check logs: ssh -i $KeyFile $RemoteUser@$RemoteHost 'cd $RemotePath && npm start'" -ForegroundColor Cyan 