#!/bin/bash

# Test cross-session memory with curl commands
# This script creates a session, stores info, then tests retrieval in a new session

API_BASE="http://localhost:3000"
COOKIE_JAR="/tmp/chatsg-cookies.txt"

echo "=== Cross-Session Memory Test with CURL ==="
echo ""

# Step 1: Get CSRF token (simulates initial page load)
echo "1️⃣ Getting CSRF token..."
CSRF_TOKEN=$(curl -s -c "$COOKIE_JAR" "$API_BASE/api/config/security" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)
echo "   CSRF Token: ${CSRF_TOKEN:0:20}..."
echo ""

# Step 2: Create first session
echo "2️⃣ Creating first session..."
SESSION1=$(curl -s -X POST "$API_BASE/api/chats" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b "$COOKIE_JAR" \
  -c "$COOKIE_JAR" \
  -d '{"title":"Store Name Session","metadata":{}}' | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)

echo "   Session 1: $SESSION1"
echo ""

# Step 3: Send message to store name
echo "3️⃣ Storing 'My name is Sean and I work at OpenAI'..."
echo "   (This will stream the response)"
echo ""

curl -X POST "$API_BASE/api/chat/stream" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Accept: text/event-stream" \
  -b "$COOKIE_JAR" \
  -d "{\"message\":\"My name is Sean and I work at OpenAI\",\"sessionId\":\"$SESSION1\",\"activeSessionId\":\"$SESSION1\"}" \
  2>/dev/null | while IFS= read -r line; do
    if [[ $line == data:* ]]; then
        # Extract JSON and print tokens
        json="${line:5}"
        if [[ $json == *'"type":"token"'* ]]; then
            content=$(echo "$json" | grep -o '"content":"[^"]*' | cut -d'"' -f4)
            printf "%s" "$content"
        elif [[ $json == *'"type":"done"'* ]]; then
            echo ""
            echo "   ✓ Message stored"
            break
        fi
    fi
done

echo ""
echo "   ⏳ Waiting 5 seconds for memory indexing..."
sleep 5
echo ""

# Step 4: Create second session
echo "4️⃣ Creating second session..."
SESSION2=$(curl -s -X POST "$API_BASE/api/chats" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b "$COOKIE_JAR" \
  -c "$COOKIE_JAR" \
  -d '{"title":"Memory Test Session","metadata":{}}' | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)

echo "   Session 2: $SESSION2"
echo ""

# Step 5: Ask "What is my name?" in new session
echo "5️⃣ Asking 'What is my name?' in new session..."
echo ""

RESPONSE=""
curl -X POST "$API_BASE/api/chat/stream" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Accept: text/event-stream" \
  -b "$COOKIE_JAR" \
  -d "{\"message\":\"What is my name?\",\"sessionId\":\"$SESSION2\",\"activeSessionId\":\"$SESSION2\"}" \
  2>/dev/null | while IFS= read -r line; do
    if [[ $line == data:* ]]; then
        json="${line:5}"
        if [[ $json == *'"type":"token"'* ]]; then
            content=$(echo "$json" | grep -o '"content":"[^"]*' | cut -d'"' -f4)
            printf "%s" "$content"
            RESPONSE="${RESPONSE}${content}"
        elif [[ $json == *'"type":"done"'* ]]; then
            echo ""
            echo ""
            # Check if response contains "Sean"
            if echo "$RESPONSE" | grep -qi "sean"; then
                echo "✅ SUCCESS: The system remembered your name!"
            else
                echo "❌ FAILURE: The system did not remember your name."
            fi
            break
        fi
    fi
done

echo ""
echo "=== Test Complete ==="
echo ""
echo "To manually test:"
echo "1. Open browser to http://localhost:5173"
echo "2. Create a new chat"
echo "3. Type: What is my name?"
echo "4. The system should respond with 'Sean' if memory is working"

# Cleanup
rm -f "$COOKIE_JAR"