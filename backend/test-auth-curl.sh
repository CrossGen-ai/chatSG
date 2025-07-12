#!/bin/bash

# Simple curl commands to test auth endpoints
# Usage: ./test-auth-curl.sh [local|prod]

if [ "$1" = "local" ]; then
    BASE_URL="http://localhost:3000"
    CURL_OPTS=""
else
    BASE_URL="https://51.54.96.228"
    CURL_OPTS="-k"
fi

echo "Testing auth endpoints on: $BASE_URL"
echo ""

echo "1. Check environment:"
curl $CURL_OPTS "$BASE_URL/api/auth/check-env" | jq '.'
echo -e "\n---\n"

echo "2. Test session store:"
curl $CURL_OPTS "$BASE_URL/api/auth/test-store" | jq '.'
echo -e "\n---\n"

echo "3. Test auth flow:"
curl $CURL_OPTS "$BASE_URL/api/auth/test-flow" | jq '.'
echo -e "\n---\n"

echo "4. Test OAuth state - set:"
curl $CURL_OPTS -c /tmp/auth-cookies.txt "$BASE_URL/api/auth/test-oauth-state?action=set" | jq '.'
echo -e "\n---\n"

echo "5. Test OAuth state - get (with cookies):"
curl $CURL_OPTS -b /tmp/auth-cookies.txt "$BASE_URL/api/auth/test-oauth-state?action=get" | jq '.'
echo -e "\n---\n"

echo "6. Test cookies:"
curl $CURL_OPTS -b /tmp/auth-cookies.txt "$BASE_URL/api/auth/test-cookies" | jq '.'