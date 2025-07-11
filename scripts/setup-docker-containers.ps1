# Setup Docker Containers for ChatSG
# This script creates and runs the required Docker containers on the remote Linux VM

param(
    [string]$RemoteHost = "10.2.0.54",
    [string]$RemoteUser = "itops_admin", 
    [string]$KeyFile = "C:\Users\SeanPatterson\Downloads\vm-poc-dev-001.ppk",
    [switch]$StartContainers = $false,
    [switch]$StopContainers = $false
)

Write-Host "=== ChatSG Docker Container Setup ===" -ForegroundColor Green
Write-Host "Remote Host: $RemoteHost" -ForegroundColor Yellow
Write-Host "Remote User: $RemoteUser" -ForegroundColor Yellow
Write-Host ""

if ($StopContainers) {
    Write-Host "Stopping Docker containers..." -ForegroundColor Yellow
    $stopCommand = "echo 'Stopping ChatSG Docker containers...' && docker stop postgres-db qdrant neo4j-sg 2>/dev/null || true && echo 'Containers stopped.'"
    
    $plinkArgs = @(
        "-i", $KeyFile,
        "$RemoteUser@$RemoteHost",
        $stopCommand
    )
    
    $plinkProcess = Start-Process -FilePath "plink" -ArgumentList $plinkArgs -Wait -PassThru -NoNewWindow
    if ($plinkProcess.ExitCode -ne 0) {
        Write-Host "Error: Failed to stop containers" -ForegroundColor Red
        exit 1
    }
    exit 0
}

# Docker compose configuration for all services - using Unix line endings
$dockerComposeContent = @'
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: postgres-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}
      POSTGRES_DB: chatsg
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  qdrant:
    image: qdrant/qdrant
    container_name: qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped

  neo4j:
    image: neo4j:latest
    container_name: neo4j-sg
    environment:
      NEO4J_AUTH: neo4j/${NEO4J_PASSWORD:-password}
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    restart: unless-stopped

volumes:
  postgres_data:
  qdrant_data:
  neo4j_data:
  neo4j_logs:
'@

# Convert Windows line endings to Unix line endings
$dockerComposeContent = $dockerComposeContent -replace "`r`n", "`n"

Write-Host "Setting up Docker configuration on remote server..." -ForegroundColor Cyan

# Create the setup script as a temporary file to avoid line ending issues
$setupScriptContent = @"
#!/bin/bash
set -e

# Create directory for Docker configs
mkdir -p ~/chatsg-docker
cd ~/chatsg-docker

# Create docker-compose.yml
cat > docker-compose.yml << DOCKEREOF
$dockerComposeContent
DOCKEREOF

# Create .env file for Docker if it doesn't exist
if [ ! -f .env ]; then
    cat > .env << ENVEOF
# Docker environment variables
POSTGRES_PASSWORD=your_secure_password
NEO4J_PASSWORD=your_secure_password
ENVEOF
    echo "Created .env file - PLEASE UPDATE PASSWORDS!"
fi

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed!"
    echo "Please install Docker first:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install docker.io docker-compose"
    echo "  sudo usermod -aG docker \$USER"
    exit 1
fi

# Check if Docker daemon is running
if ! sudo systemctl is-active --quiet docker; then
    echo "Starting Docker daemon..."
    sudo systemctl start docker
    sudo systemctl enable docker
fi

# Check if user is in docker group
if ! groups \$USER | grep -q docker; then
    echo "Adding user to docker group..."
    sudo usermod -aG docker \$USER
    echo "User added to docker group. You may need to log out and back in for this to take effect."
    echo "For now, we'll use sudo for Docker commands."
    USE_SUDO=true
else
    USE_SUDO=false
fi

# Test Docker access
if ! docker ps &> /dev/null; then
    echo "Docker permission issue detected. Will use sudo for Docker commands."
    USE_SUDO=true
fi

# Check if containers are already running
echo ""
echo "Current Docker containers:"
if [ "\$USE_SUDO" = "true" ]; then
    sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers running"
else
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers running"
fi

echo ""
echo "Docker setup complete. Configuration saved to ~/chatsg-docker/"
echo ""
echo "To start containers, run:"
echo "  cd ~/chatsg-docker"
if [ "$USE_SUDO" = "true" ]; then
    echo "  sudo docker-compose up -d"
    echo "Creating sudo flag file for future use..."
    touch ~/.docker-use-sudo
else
    echo "  docker-compose up -d"
    rm -f ~/.docker-use-sudo 2>/dev/null || true
fi
echo ""
echo "To check container status:"
if [ "$USE_SUDO" = "true" ]; then
    echo "  sudo docker ps"
else
    echo "  docker ps"
fi
echo ""
echo "To view logs:"
if [ "$USE_SUDO" = "true" ]; then
    echo "  sudo docker logs postgres-db"
    echo "  sudo docker logs qdrant"
    echo "  sudo docker logs neo4j-sg"
else
    echo "  docker logs postgres-db"
    echo "  docker logs qdrant"
    echo "  docker logs neo4j-sg"
fi
"@

# Convert to Unix line endings
$setupScriptContent = $setupScriptContent -replace "`r`n", "`n"

# Write the script to a temporary file
$tempScriptPath = [System.IO.Path]::GetTempFileName() + ".sh"
# Use UTF8 without BOM to avoid Linux compatibility issues
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($tempScriptPath, $setupScriptContent, $utf8WithoutBom)

# Copy the script to remote server and execute it
Write-Host "Copying and executing setup script..." -ForegroundColor Cyan

# Use Start-Process to handle complex paths properly
$destination = "$RemoteUser@$RemoteHost" + ":/tmp/chatsg-setup.sh"
$pscpArgs = @(
    "-i", $KeyFile,
    $tempScriptPath,
    $destination
)

$pscpProcess = Start-Process -FilePath "pscp" -ArgumentList $pscpArgs -Wait -PassThru -NoNewWindow
if ($pscpProcess.ExitCode -ne 0) {
    Write-Host "Error: Failed to copy script to remote server" -ForegroundColor Red
    Remove-Item $tempScriptPath -Force
    exit 1
}

$plinkArgs = @(
    "-i", $KeyFile,
    "$RemoteUser@$RemoteHost",
    "chmod +x /tmp/chatsg-setup.sh && /tmp/chatsg-setup.sh && rm /tmp/chatsg-setup.sh"
)

$plinkProcess = Start-Process -FilePath "plink" -ArgumentList $plinkArgs -Wait -PassThru -NoNewWindow
if ($plinkProcess.ExitCode -ne 0) {
    Write-Host "Error: Failed to execute script on remote server" -ForegroundColor Red
    Remove-Item $tempScriptPath -Force
    exit 1
}

# Clean up temporary file
Remove-Item $tempScriptPath -Force

if ($StartContainers) {
    Write-Host ""
    Write-Host "Starting Docker containers..." -ForegroundColor Cyan
    $startCommand = "cd ~/chatsg-docker && echo 'Starting containers with docker-compose...' && if [ -f ~/.docker-use-sudo ] || ! docker ps &>/dev/null; then sudo docker-compose up -d; else docker-compose up -d; fi && echo '' && echo 'Waiting for containers to be ready...' && sleep 10 && echo '' && echo 'Container status:' && if [ -f ~/.docker-use-sudo ] || ! docker ps &>/dev/null; then sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'; else docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'; fi"
    
    $plinkArgs = @(
        "-i", $KeyFile,
        "$RemoteUser@$RemoteHost",
        $startCommand
    )
    
    $plinkProcess = Start-Process -FilePath "plink" -ArgumentList $plinkArgs -Wait -PassThru -NoNewWindow
    if ($plinkProcess.ExitCode -ne 0) {
        Write-Host "Error: Failed to start containers" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Connection strings for ChatSG .env file:" -ForegroundColor Yellow
Write-Host "DATABASE_URL=postgresql://postgres:your_password@$RemoteHost:5433/chatsg" -ForegroundColor White
Write-Host "QDRANT_URL=http://$RemoteHost:6333" -ForegroundColor White
Write-Host "NEO4J_URL=neo4j://$RemoteHost:7687" -ForegroundColor White
Write-Host ""
Write-Host "Remember to:" -ForegroundColor Yellow
Write-Host "1. Update passwords in ~/chatsg-docker/.env on remote server" -ForegroundColor White
Write-Host "2. Update ChatSG .env with correct connection strings" -ForegroundColor White
Write-Host "3. Ensure firewall allows Docker ports (5433, 6333, 7474, 7687)" -ForegroundColor White