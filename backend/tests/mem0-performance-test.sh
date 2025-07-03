#!/bin/bash

echo "=== Mem0 Performance Impact Test ==="
echo ""
echo "This test will restart the backend server with different Mem0 configurations"
echo "to measure the performance impact of the memory system."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to wait for server to be ready
wait_for_server() {
    echo -n "Waiting for server to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/api/debug/mem0-status > /dev/null 2>&1; then
            echo " Ready!"
            return 0
        fi
        echo -n "."
        sleep 1
    done
    echo " Failed!"
    return 1
}

# Function to stop backend server
stop_backend() {
    echo "Stopping backend server..."
    # Find and kill the backend server process
    pkill -f "node server.js" || true
    sleep 2
}

# Function to start backend server
start_backend() {
    local env_vars="$1"
    echo "Starting backend server with: $env_vars"
    cd /Users/crossgenai/sg/chatSG/backend
    eval "$env_vars node server.js" > /tmp/backend-test.log 2>&1 &
    wait_for_server
}

# Save current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo ""
echo -e "${YELLOW}Test 1: Performance WITH Mem0 enabled (current default)${NC}"
echo "======================================================="
stop_backend
start_backend ""
sleep 2

# Run performance test
cd "$SCRIPT_DIR"
node test-timing.js
MEM0_ENABLED_RESULTS=$(node test-timing.js 2>&1 | grep -E "(Total time:|Time to first token:|Initial delay)" | tail -3)

echo ""
echo -e "${YELLOW}Test 2: Performance WITHOUT Mem0 (disabled)${NC}"
echo "==========================================="
stop_backend
start_backend "MEM0_ENABLED=false"
sleep 2

# Check if Mem0 is actually disabled
MEM0_STATUS=$(curl -s http://localhost:3000/api/debug/mem0-status | jq -r '.mem0Enabled')
echo "Mem0 status: $MEM0_STATUS"

# Run performance test
cd "$SCRIPT_DIR"
MEM0_DISABLED_RESULTS=$(node test-timing.js 2>&1 | grep -E "(Total time:|Time to first token:|Initial delay)" | tail -3)

echo ""
echo -e "${GREEN}=== PERFORMANCE COMPARISON ===${NC}"
echo ""
echo -e "${YELLOW}With Mem0 Enabled:${NC}"
echo "$MEM0_ENABLED_RESULTS"
echo ""
echo -e "${YELLOW}With Mem0 Disabled:${NC}"
echo "$MEM0_DISABLED_RESULTS"

echo ""
echo -e "${GREEN}=== RECOMMENDATIONS ===${NC}"
echo ""
echo "1. If Mem0 disabled shows significantly better performance:"
echo "   - Consider implementing lazy initialization for Mem0"
echo "   - Add connection pooling for Neo4j"
echo "   - Implement caching for frequent queries"
echo ""
echo "2. If performance is similar:"
echo "   - Look for other bottlenecks (LLM initialization, agent loading)"
echo "   - Check network latency to LLM providers"
echo ""

# Restore original server state
echo ""
echo "Restoring original server configuration..."
stop_backend
start_backend ""

echo ""
echo "Test complete!"