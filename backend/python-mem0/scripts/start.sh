#!/bin/bash

# Start script for ChatSG Mem0 Python service

# Colors for output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting ChatSG Mem0 Python Service...${NC}"

# Change to project directory
cd "$(dirname "$0")/.." || exit 1

# Check if UV is installed
if ! command -v uv &> /dev/null; then
    echo -e "${RED}UV is not installed. Please install UV first.${NC}"
    echo "Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Install dependencies if needed
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    uv venv
fi

# Install/update dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
uv pip sync pyproject.toml

# Load environment variables from parent .env
if [ -f "../.env" ]; then
    echo -e "${GREEN}Loading environment variables from ../.env${NC}"
    export $(cat ../.env | grep -v '^#' | xargs)
else
    echo -e "${RED}Warning: ../.env file not found${NC}"
fi

# Start the service
echo -e "${GREEN}Starting FastAPI service on port 8001...${NC}"
echo -e "${YELLOW}Provider: ${MEM0_MODELS}${NC}"

# Run with UV
uv run uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload