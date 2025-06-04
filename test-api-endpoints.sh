#!/bin/bash
# API Endpoint Testing Script
# Tests critical endpoints to ensure no breaking changes

echo "🧪 Testing Strapi API Endpoints..."
echo "================================"

BASE_URL="http://localhost:1337"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    
    response=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$BASE_URL$endpoint")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} $description: $endpoint (Status: $response)"
    else
        echo -e "${RED}✗${NC} $description: $endpoint (Expected: $expected_status, Got: $response)"
    fi
}

# Test basic connectivity
echo "1. Testing Basic Connectivity..."
test_endpoint "GET" "/_health" "200" "Strapi Health"
test_endpoint "GET" "/api/health" "200" "Custom Health Check"
test_endpoint "GET" "/api/health/ping" "200" "Health Ping"

echo ""
echo "2. Testing Public Content APIs..."
test_endpoint "GET" "/api/artists-work" "200" "Artists Work Collection"
test_endpoint "GET" "/api/artist" "200" "Artists Collection"
test_endpoint "GET" "/api/paper-type" "200" "Paper Types"

echo ""
echo "3. Testing Cart API (Should require auth)..."
test_endpoint "GET" "/api/cart" "401" "Cart (Auth Required)"
test_endpoint "POST" "/api/cart/add-item" "401" "Add to Cart (Auth Required)"

echo ""
echo "4. Testing Order API (Should require auth)..."
test_endpoint "GET" "/api/orders" "401" "Orders (Auth Required)"

echo ""
echo "5. Testing Stripe API (Should require auth)..."
test_endpoint "POST" "/api/stripe/create-payment-intent" "401" "Payment Intent (Auth Required)"

echo ""
echo "6. Testing Admin Panel..."
test_endpoint "GET" "/admin" "200" "Admin Panel"

echo ""
echo "================================"
echo "✅ Basic endpoint testing complete!"
echo ""
echo "Note: 401 responses for protected endpoints are expected and correct."
echo "To test authenticated endpoints, you'll need to add an auth token."