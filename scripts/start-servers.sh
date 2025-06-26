#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for visible flag
VISIBLE=false
if [[ "$1" == "-v" ]] || [[ "$1" == "--visible" ]] || [[ "$1" == "-vis" ]]; then
    VISIBLE=true
fi

# Function to check if port is in use
check_port() {
    lsof -i :$1 >/dev/null 2>&1
}

# Kill existing processes on our ports
echo -e "${YELLOW}Checking for existing processes...${NC}"
if check_port 3000; then
    echo -e "${RED}Killing process on port 3000${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null
fi
if check_port 5173; then
    echo -e "${RED}Killing process on port 5173${NC}"
    lsof -ti:5173 | xargs kill -9 2>/dev/null
fi

# Get project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ "$VISIBLE" = true ]; then
    # Start servers in tmux sessions first, then attach in visible Terminal windows
    echo -e "${GREEN}Starting servers in tmux sessions with Terminal windows...${NC}"
    
    # Create tmux sessions in background
    tmux new-session -d -s chatsg-backend -c "$PROJECT_ROOT/backend" 'npm run dev 2>&1 | tee logs/backend.log'
    echo -e "${GREEN}✓ Backend tmux session created${NC}"
    
    tmux new-session -d -s chatsg-frontend -c "$PROJECT_ROOT/frontend" 'npm run dev 2>&1 | tee logs/frontend.log'
    echo -e "${GREEN}✓ Frontend tmux session created${NC}"
    
    # Give tmux sessions a moment to initialize
    sleep 1
    
    # Open Terminal windows and attach to tmux sessions
    osascript -e "
    tell application \"Terminal\"
        activate
        do script \"tmux attach-session -t chatsg-backend\"
        set custom title of front window to \"ChatSG Backend (tmux)\"
    end tell"
    
    osascript -e "
    tell application \"Terminal\"
        activate
        do script \"tmux attach-session -t chatsg-frontend\"
        set custom title of front window to \"ChatSG Frontend (tmux)\"
    end tell"
    
    echo -e "${GREEN}✓ Terminal windows opened and attached to tmux sessions${NC}"
    echo -e "\n${YELLOW}Tip: Use Ctrl+B, D to detach from tmux without stopping the server${NC}"
else
    # Start servers in tmux sessions (background)
    echo -e "${GREEN}Starting servers in tmux sessions (background)...${NC}"
    
    # Backend
    tmux new-session -d -s chatsg-backend -c "$PROJECT_ROOT/backend" 'npm run dev 2>&1 | tee logs/backend.log'
    echo -e "${GREEN}✓ Backend started in tmux session 'chatsg-backend'${NC}"
    
    # Frontend
    tmux new-session -d -s chatsg-frontend -c "$PROJECT_ROOT/frontend" 'npm run dev 2>&1 | tee logs/frontend.log'
    echo -e "${GREEN}✓ Frontend started in tmux session 'chatsg-frontend'${NC}"
fi

# Wait for servers to be ready
echo -e "${YELLOW}Waiting for servers to be ready...${NC}"
sleep 3

# Check if servers are running
if check_port 3000; then
    echo -e "${GREEN}✓ Backend is running on port 3000${NC}"
else
    echo -e "${RED}✗ Backend failed to start${NC}"
fi

if check_port 5173; then
    echo -e "${GREEN}✓ Frontend is running on port 5173${NC}"
else
    echo -e "${RED}✗ Frontend failed to start${NC}"
fi

if [ "$VISIBLE" = false ]; then
    echo -e "\n${YELLOW}To view logs:${NC}"
    echo "  Backend:  tmux attach -t chatsg-backend"
    echo "  Frontend: tmux attach -t chatsg-frontend"
fi
echo -e "\n${YELLOW}To stop servers:${NC}"
echo "  npm run stop"