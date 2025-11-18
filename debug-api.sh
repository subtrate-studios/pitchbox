#!/bin/bash

# Debug script for testing the /api/analyze endpoint

echo "🔍 Testing /api/analyze endpoint..."
echo ""

# Test URL
REPO_URL="https://github.com/waku-org/opchan/"

echo "Testing with repository: $REPO_URL"
echo ""

# Make the request with verbose output
curl -v -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d "{
    \"githubUrl\": \"$REPO_URL\",
    \"style\": \"business\",
    \"targetDuration\": 180,
    \"focusAreas\": [\"routing\", \"data-fetching\"],
    \"retrievalCount\": 20
  }" 2>&1 | tee api-debug.log

echo ""
echo "✅ Response logged to api-debug.log"
echo ""
echo "📋 Check server logs for detailed error messages:"
echo "   - Look for '❌ RAG generation error:'"
echo "   - Look for 'Error details:'"
echo "   - Look for any stack traces"
