#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping ChatSG servers...${NC}"

# Kill tmux sessions
if tmux has-session -t chatsg-backend 2>/dev/null; then
    tmux kill-session -t chatsg-backend
    echo -e "${GREEN}✓ Stopped backend server${NC}"
else
    echo -e "${YELLOW}Backend server not running in tmux${NC}"
fi

if tmux has-session -t chatsg-frontend 2>/dev/null; then
    tmux kill-session -t chatsg-frontend
    echo -e "${GREEN}✓ Stopped frontend server${NC}"
else
    echo -e "${YELLOW}Frontend server not running in tmux${NC}"
fi

# Also kill any processes on the ports (in case they're running outside tmux)
if lsof -i :3000 >/dev/null 2>&1; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✓ Killed process on port 3000${NC}"
fi

if lsof -i :5173 >/dev/null 2>&1; then
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✓ Killed process on port 5173${NC}"
fi

echo -e "${GREEN}All servers stopped!${NC}"