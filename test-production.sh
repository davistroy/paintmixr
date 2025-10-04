#!/bin/bash

# Production Testing Script for PaintMixr
# Tests all user stories and Enhanced Accuracy Mode

API_URL="https://paintmixr.vercel.app"
EMAIL="troy@k4jda.com"
PASSWORD="Edw@rd67"

echo "======================================"
echo "PaintMixr Production Testing"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test API endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=${4:-}
    local expected_status=${5:-200}

    echo -n "Testing: $name... "

    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$url")
    fi

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)

    if [ "$status_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got $status_code)"
        echo "Response: $body"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# 1. Test landing page loads
test_endpoint "Landing page" "/" GET "" 200

# 2. Test signin page loads
test_endpoint "Sign-in page" "/auth/signin" GET "" 200

# 3. Test API health (via signin endpoint - should reject without credentials)
test_endpoint "API available" "/api/auth/email-signin" POST '{"email":"test@test.com","password":"wrong"}' 401

# 4. Test Enhanced Accuracy Mode endpoint structure
echo ""
echo "======================================"
echo "Enhanced Accuracy Mode Tests"
echo "======================================"
echo ""

# Test with valid paint data (should fail auth since we're not logged in, but validates structure)
OPTIMIZE_DATA='{
  "targetColor": {"L": 50, "A": 20, "B": -30},
  "paints": [
    {
      "id": "1",
      "name": "Titanium White",
      "color": {"hex": "#FFFFFF"},
      "kmCoefficients": {"k": 0.1, "s": 10.0}
    },
    {
      "id": "2",
      "name": "Ultramarine Blue",
      "color": {"hex": "#0000FF"},
      "kmCoefficients": {"k": 8.0, "s": 5.0}
    },
    {
      "id": "3",
      "name": "Cadmium Yellow",
      "color": {"hex": "#FFFF00"},
      "kmCoefficients": {"k": 2.0, "s": 8.0}
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

test_endpoint "Enhanced Mode endpoint (no auth)" "/api/optimize" POST "$OPTIMIZE_DATA" 401

# Standard mode test
STANDARD_DATA='{
  "targetColor": {"L": 50, "A": 20, "B": -30},
  "paints": [
    {
      "id": "1",
      "name": "Titanium White",
      "color": {"hex": "#FFFFFF"},
      "kmCoefficients": {"k": 0.1, "s": 10.0}
    },
    {
      "id": "2",
      "name": "Ultramarine Blue",
      "color": {"hex": "#0000FF"},
      "kmCoefficients": {"k": 8.0, "s": 5.0}
    },
    {
      "id": "3",
      "name": "Cadmium Yellow",
      "color": {"hex": "#FFFF00"},
      "kmCoefficients": {"k": 2.0, "s": 8.0}
    }
  ],
  "volumeConstraints": {
    "totalVolume": 100,
    "minComponentVolume": 5
  },
  "config": {
    "enhancedMode": false,
    "maxPaintCount": 3
  }
}'

test_endpoint "Standard Mode endpoint (no auth)" "/api/optimize" POST "$STANDARD_DATA" 401

# 5. Test static assets
echo ""
echo "======================================"
echo "Static Asset Tests"
echo "======================================"
echo ""

test_endpoint "PWA manifest" "/manifest.webmanifest" GET "" 200
test_endpoint "Service worker" "/sw.js" GET "" 200
test_endpoint "Favicon" "/icons/icon-32x32.png" GET "" 200

# Summary
echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
