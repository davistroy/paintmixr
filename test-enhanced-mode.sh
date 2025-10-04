#!/bin/bash

# Test Enhanced Accuracy Mode in Production
# Uses provided credentials: troy@k4jda.com / Edw@rd67

set -e

API_URL="https://paintmixr.vercel.app"
EMAIL="troy@k4jda.com"
PASSWORD="Edw@rd67"

echo "======================================"
echo "Enhanced Accuracy Mode Production Test"
echo "======================================"
echo ""

# Test 1: Authenticate
echo "Test 1: Authenticating..."
AUTH_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/email-signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c /tmp/cookies.txt)

echo "Auth response: $AUTH_RESPONSE"

if echo "$AUTH_RESPONSE" | grep -q "success"; then
  echo "✓ Authentication successful"
else
  echo "✗ Authentication failed"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo ""
echo "Test 2: Testing Enhanced Accuracy Mode..."

# Create test paint data
OPTIMIZE_REQUEST='{
  "targetColor": {
    "L": 50,
    "A": 20,
    "B": -30
  },
  "paints": [
    {
      "id": "paint1",
      "name": "Titanium White",
      "color": {"hex": "#FFFFFF"},
      "kmCoefficients": {"k": 0.1, "s": 10.0}
    },
    {
      "id": "paint2",
      "name": "Ultramarine Blue",
      "color": {"hex": "#0000FF"},
      "kmCoefficients": {"k": 8.0, "s": 5.0}
    },
    {
      "id": "paint3",
      "name": "Cadmium Yellow",
      "color": {"hex": "#FFFF00"},
      "kmCoefficients": {"k": 2.0, "s": 8.0}
    },
    {
      "id": "paint4",
      "name": "Burnt Sienna",
      "color": {"hex": "#A0522D"},
      "kmCoefficients": {"k": 5.0, "s": 6.0}
    }
  ],
  "volumeConstraints": {
    "totalVolume": 100,
    "minComponentVolume": 5
  },
  "config": {
    "enhancedMode": true,
    "maxPaintCount": 5
  }
}'

# Test Enhanced Mode optimization
OPTIMIZE_RESPONSE=$(curl -s -X POST "$API_URL/api/optimize" \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d "$OPTIMIZE_REQUEST")

echo "Optimization response:"
echo "$OPTIMIZE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$OPTIMIZE_RESPONSE"

# Check for success
if echo "$OPTIMIZE_RESPONSE" | grep -q "formula\|paints"; then
  echo ""
  echo "✓ Enhanced Accuracy Mode working!"

  # Extract Delta E if available
  DELTA_E=$(echo "$OPTIMIZE_RESPONSE" | grep -o '"deltaE":[0-9.]*' | cut -d: -f2)
  if [ -n "$DELTA_E" ]; then
    echo "  Delta E achieved: $DELTA_E"
  fi

  # Check algorithm used
  ALGORITHM=$(echo "$OPTIMIZE_RESPONSE" | grep -o '"algorithm":"[^"]*"' | cut -d'"' -f4)
  if [ -n "$ALGORITHM" ]; then
    echo "  Algorithm: $ALGORITHM"
  fi
else
  echo ""
  echo "✗ Enhanced mode test failed"
  exit 1
fi

# Cleanup
rm -f /tmp/cookies.txt

echo ""
echo "======================================"
echo "All tests passed!"
echo "======================================"
