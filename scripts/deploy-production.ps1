# ChatSG Production Deployment Script
# Usage: .\deploy-production.ps1
# For GCC High deployment with full PostgreSQL setup

param(
    [string]$RemoteHost = "10.2.0.54",
    [string]$RemoteUser = "itops_admin", 
    [string]$KeyFile = "C:\Users\SeanPatterson\Downloads\vm-poc-dev-001.ppk",
    [string]$RemotePath = "/home/itops_admin/chatSG",
    [switch]$UploadEnv = $false,  # Only upload .env if explicitly requested
    [switch]$FullDeploy = $false  # Full deployment including TypeScript build
)

Write-Host "=== ChatSG Production Deployment Script ===" -ForegroundColor Green
Write-Host "Remote Host: $RemoteHost" -ForegroundColor Yellow
Write-Host "Remote User: $RemoteUser" -ForegroundColor Yellow
Write-Host "Remote Path: $RemotePath" -ForegroundColor Yellow
Write-Host ""

# Step 1: Build Backend TypeScript (if requested)
if ($FullDeploy) {
    Write-Host "Step 1: Building Backend TypeScript..." -ForegroundColor Cyan
    Set-Location backend
    try {
        npm run build
        Write-Host "✅ Backend TypeScript build completed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Backend build failed: $_" -ForegroundColor Red
        exit 1
    }
    Set-Location ..
}

# Step 2: Build Frontend
Write-Host "Step 2: Building Frontend..." -ForegroundColor Cyan
Set-Location frontend
try {
    npm run build
    Write-Host "✅ Frontend build completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend build failed: $_" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Step 3: Create deployment package
Write-Host "Step 3: Creating deployment package..." -ForegroundColor Cyan
$deployDir = "deploy-package"
if (Test-Path $deployDir) {
    Remove-Item $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

# Copy backend files
Write-Host "Copying backend files..." -ForegroundColor Yellow
Copy-Item "backend/server.js" "$deployDir/"
Copy-Item "backend/package.json" "$deployDir/"
Copy-Item "backend/package-lock.json" "$deployDir/" -ErrorAction SilentlyContinue
Copy-Item "backend/ecosystem.config.js" "$deployDir/" -ErrorAction SilentlyContinue

# Copy backend source and dist
Copy-Item "backend/src" "$deployDir/" -Recurse
Copy-Item "backend/dist" "$deployDir/" -Recurse
Copy-Item "backend/utils" "$deployDir/" -Recurse
Copy-Item "backend/middleware" "$deployDir/" -Recurse
Copy-Item "backend/config" "$deployDir/" -Recurse
Copy-Item "backend/tests" "$deployDir/" -Recurse  # <--- Add this line to include tests

# Copy environment template (not actual .env)
if (Test-Path "backend/env.production.sample") {
    Copy-Item "backend/env.production.sample" "$deployDir/"
}

# Copy frontend build
Copy-Item "frontend/dist" "$deployDir/public" -Recurse

# Copy deployment scripts
New-Item -ItemType Directory -Path "$deployDir/scripts" | Out-Null
Copy-Item "scripts/*.sh" "$deployDir/scripts/" -ErrorAction SilentlyContinue

# Create deployment info
@"
# ChatSG Production Deployment
Deployed: $(Get-Date)
Frontend: React + TypeScript + Vite
Backend: Node.js + Express + TypeScript
Database: PostgreSQL with pgvector
Memory: Mem0 + Qdrant + Neo4j
Environment: Production (GCC High ready)
"@ | Out-File "$deployDir/DEPLOYMENT_INFO.txt"

Write-Host "✅ Deployment package created" -ForegroundColor Green

# Step 4: Upload to remote server
Write-Host "Step 4: Uploading to remote server..." -ForegroundColor Cyan

# Create remote directory structure
Write-Host "Creating remote directory structure..." -ForegroundColor Yellow
& plink -i $KeyFile "$RemoteUser@$RemoteHost" "mkdir -p $RemotePath/{src,dist,utils,middleware,config,scripts,public}"

# Upload files
Write-Host "Uploading backend files..." -ForegroundColor Yellow
& pscp -i $KeyFile "$deployDir/server.js" "${RemoteUser}@${RemoteHost}:$RemotePath/"
& pscp -i $KeyFile "$deployDir/package.json" "${RemoteUser}@${RemoteHost}:$RemotePath/"
& pscp -i $KeyFile "$deployDir/package-lock.json" "${RemoteUser}@${RemoteHost}:$RemotePath/" -ErrorAction SilentlyContinue
& pscp -i $KeyFile "$deployDir/ecosystem.config.js" "${RemoteUser}@${RemoteHost}:$RemotePath/" -ErrorAction SilentlyContinue

# Upload directories
Write-Host "Uploading source directories..." -ForegroundColor Yellow
& pscp -i $KeyFile -r "$deployDir/src" "${RemoteUser}@${RemoteHost}:$RemotePath/"
& pscp -i $KeyFile -r "$deployDir/dist" "${RemoteUser}@${RemoteHost}:$RemotePath/"
& pscp -i $KeyFile -r "$deployDir/utils" "${RemoteUser}@${RemoteHost}:$RemotePath/"
& pscp -i $KeyFile -r "$deployDir/middleware" "${RemoteUser}@${RemoteHost}:$RemotePath/"
& pscp -i $KeyFile -r "$deployDir/config" "${RemoteUser}@${RemoteHost}:$RemotePath/"
& pscp -i $KeyFile -r "$deployDir/tests" "${RemoteUser}@${RemoteHost}:$RemotePath/"  # <--- Add this line to upload tests
& pscp -i $KeyFile -r "$deployDir/scripts" "${RemoteUser}@${RemoteHost}:$RemotePath/"

# Upload environment template
if (Test-Path "$deployDir/env.production.sample") {
    & pscp -i $KeyFile "$deployDir/env.production.sample" "${RemoteUser}@${RemoteHost}:$RemotePath/"
}

# Upload .env if requested and exists
if ($UploadEnv -and (Test-Path "backend/.env")) {
    Write-Host "Uploading .env file..." -ForegroundColor Yellow
    & pscp -i $KeyFile "backend/.env" "${RemoteUser}@${RemoteHost}:$RemotePath/"
}

# Upload frontend build
Write-Host "Uploading frontend files..." -ForegroundColor Yellow
& pscp -i $KeyFile -r "$deployDir/public" "${RemoteUser}@${RemoteHost}:$RemotePath/"

# Upload deployment info
& pscp -i $KeyFile "$deployDir/DEPLOYMENT_INFO.txt" "${RemoteUser}@${RemoteHost}:$RemotePath/"

Write-Host "✅ Files uploaded successfully" -ForegroundColor Green
if (-not $UploadEnv) {
    Write-Host "Note: .env file NOT uploaded to preserve remote configuration" -ForegroundColor Yellow
    Write-Host "Use -UploadEnv flag if you want to overwrite remote .env" -ForegroundColor Yellow
}

# Step 5: Install dependencies and configure
Write-Host "Step 5: Installing dependencies on remote server..." -ForegroundColor Cyan

$remoteCommands = @"
cd $RemotePath
echo "Installing Node.js dependencies..."
# Check and install Node.js if missing
if ! command -v node &> /dev/null; then
  echo "Node.js not found. Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
npm install --production
echo "Dependencies installed successfully"

# Check for .env file
if [ ! -f .env ]; then
    if [ -f env.production.sample ]; then
        echo ""
        echo "WARNING: No .env file found!"
        echo "Please create .env from env.production.sample and configure:"
        echo "- Database connection (DATABASE_URL)"
        echo "- Azure AD credentials for GCC High"
        echo "- Session secrets"
        echo "- SSL certificates"
    fi
else
    echo "Environment file found"
fi

# Make scripts executable
chmod +x scripts/*.sh 2>/dev/null

# Check if Docker containers are running
echo "Checking Docker containers..."
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "postgres|qdrant|neo4j" || echo "WARNING: Database containers not found!"

echo ""
echo "=== Deployment Complete ==="
echo "Backend: $RemotePath/server.js"
echo "Frontend: $RemotePath/public/"
echo ""
echo "Next steps:"
echo "1. Configure .env file with production settings"
echo "2. Ensure Docker containers are running (postgres, qdrant, neo4j)"
echo "3. Configure nginx reverse proxy"
echo "4. Set up SSL certificates"
echo "5. Start with PM2: pm2 start ecosystem.config.js --env production"
"@
# Convert to Unix line endings
$remoteCommands = $remoteCommands -replace "`r`n", "`n"

Write-Host "Running remote installation commands..." -ForegroundColor Yellow
& plink -i $KeyFile "$RemoteUser@$RemoteHost" $remoteCommands

# Step 6: Cleanup
Write-Host "Step 6: Cleaning up..." -ForegroundColor Cyan
Remove-Item $deployDir -Recurse -Force
Write-Host "✅ Cleanup completed" -ForegroundColor Green

Write-Host ""
Write-Host "=== Deployment Summary ===" -ForegroundColor Green
Write-Host "✅ Frontend built and deployed to: $RemotePath/public/" -ForegroundColor Green
Write-Host "✅ Backend deployed to: $RemotePath/" -ForegroundColor Green
Write-Host "✅ Dependencies installed on remote server" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. SSH to the server: plink -i $KeyFile $RemoteUser@$RemoteHost" -ForegroundColor White
Write-Host "2. Navigate to app: cd $RemotePath" -ForegroundColor White
Write-Host "3. Configure environment: nano .env" -ForegroundColor White
Write-Host "4. Start with PM2: pm2 start ecosystem.config.js --env production" -ForegroundColor White
Write-Host "5. Configure nginx: sudo nano /etc/nginx/sites-available/chatsg" -ForegroundColor White
Write-Host ""
Write-Host "For GCC High:" -ForegroundColor Cyan
Write-Host "- Update Azure authority URL in .env" -ForegroundColor White
Write-Host "- Ensure AZURE_ENVIRONMENT=GCCHIGH" -ForegroundColor White
Write-Host "- Configure SSL with approved certificates" -ForegroundColor White