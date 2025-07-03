#!/bin/bash

echo "=== Mem0 Performance Comparison Test ==="
echo "This will test performance with Mem0 enabled vs disabled"
echo ""

# Test with Mem0 enabled (default)
echo "1. Testing WITH Mem0 enabled..."
echo "================================"
node test-timing.js
echo ""

# Brief pause
sleep 2

# Test with Mem0 disabled
echo "2. Testing WITHOUT Mem0 (disabled)..."
echo "===================================="
MEM0_ENABLED=false node test-timing.js
echo ""

echo "=== Comparison Complete ==="
echo "Compare the timing results above to identify if Mem0 is causing delays"