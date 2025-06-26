#!/bin/bash

# Colors for output
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}ChatSG Server Status:${NC}\n"

# Check tmux sessions
echo "Active tmux sessions:"
tmux ls 2>/dev/null | grep chatsg || echo "  No ChatSG tmux sessions found"

echo -e "\n${YELLOW}Port Status:${NC}"
echo -n "  Backend (3000): "
lsof -i :3000 >/dev/null 2>&1 && echo "✓ Running" || echo "✗ Not running"
echo -n "  Frontend (5174): "
lsof -i :5174 >/dev/null 2>&1 && echo "✓ Running" || echo "✗ Not running"

echo -e "\n${YELLOW}View live logs:${NC}"
echo "  Backend:  tmux attach -t chatsg-backend"
echo "  Frontend: tmux attach -t chatsg-frontend"
echo "  (Press Ctrl+B, then D to detach from tmux)"

echo -e "\n${YELLOW}Recent backend logs:${NC}"
if [ -f logs/backend.log ]; then
    tail -n 10 logs/backend.log
else
    echo "  No log file found"
fi