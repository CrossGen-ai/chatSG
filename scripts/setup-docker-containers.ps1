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
    $stopCommand = @"
echo "Stopping ChatSG Docker containers..."
docker stop postgres-db qdrant neo4j-sg 2>/dev/null || true
echo "Containers stopped."
"@
    & plink -i $KeyFile "$RemoteUser@$RemoteHost" $stopCommand
    exit 0
}

# Docker compose configuration for all services
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

# Commands to set up Docker containers
$setupCommands = @"
# Create directory for Docker configs
mkdir -p ~/chatsg-docker
cd ~/chatsg-docker

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
$dockerComposeContent
EOF

# Create .env file for Docker if it doesn't exist
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# Docker environment variables
POSTGRES_PASSWORD=your_secure_password
NEO4J_PASSWORD=your_secure_password
EOF
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

# Check if containers are already running
echo ""
echo "Current Docker containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Docker setup complete. Configuration saved to ~/chatsg-docker/"
echo ""
echo "To start containers, run:"
echo "  cd ~/chatsg-docker"
echo "  docker-compose up -d"
echo ""
echo "To check container status:"
echo "  docker ps"
echo ""
echo "To view logs:"
echo "  docker logs postgres-db"
echo "  docker logs qdrant"
echo "  docker logs neo4j-sg"
"@

Write-Host "Setting up Docker configuration on remote server..." -ForegroundColor Cyan
& plink -i $KeyFile "$RemoteUser@$RemoteHost" $setupCommands

if ($StartContainers) {
    Write-Host ""
    Write-Host "Starting Docker containers..." -ForegroundColor Cyan
    $startCommand = @"
cd ~/chatsg-docker
echo "Starting containers with docker-compose..."
docker-compose up -d
echo ""
echo "Waiting for containers to be ready..."
sleep 10
echo ""
echo "Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
"@
    & plink -i $KeyFile "$RemoteUser@$RemoteHost" $startCommand
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Connection strings for ChatSG .env file:" -ForegroundColor Yellow
Write-Host "DATABASE_URL=postgresql://postgres:your_password@localhost:5433/chatsg" -ForegroundColor White
Write-Host "QDRANT_URL=http://localhost:6333" -ForegroundColor White
Write-Host "NEO4J_URL=neo4j://localhost:7687" -ForegroundColor White
Write-Host ""
Write-Host "Remember to:" -ForegroundColor Yellow
Write-Host "1. Update passwords in ~/chatsg-docker/.env" -ForegroundColor White
Write-Host "2. Update ChatSG .env with correct connection strings" -ForegroundColor White
Write-Host "3. Ensure firewall allows Docker ports if needed" -ForegroundColor White