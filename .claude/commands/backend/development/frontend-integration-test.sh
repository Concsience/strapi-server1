#!/bin/bash
# Frontend Integration Testing
# Validates API endpoints match frontend expectations

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔗 Frontend Integration Testing"
echo "=============================="

# Configuration
API_URL="${API_URL:-http://localhost:1337}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
TEST_DIR=".claude/tests/integration"
mkdir -p $TEST_DIR

# Test results
PASSED=0
FAILED=0
WARNINGS=0

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data="${5:-}"
    
    echo -n "Testing $description: "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    else
        response=$(curl -s -X $method -H "Content-Type: application/json" -d "$data" -w "\n%{http_code}" "$API_URL$endpoint")
    fi
    
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ Pass (Status: $status)${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ Fail (Expected: $expected_status, Got: $status)${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to validate response structure
validate_structure() {
    local endpoint=$1
    local expected_fields=$2
    local description=$3
    
    echo -n "Validating structure for $description: "
    
    response=$(curl -s "$API_URL$endpoint")
    
    # Check if response is valid JSON
    if ! echo "$response" | jq . >/dev/null 2>&1; then
        echo -e "${RED}✗ Invalid JSON response${NC}"
        ((FAILED++))
        return 1
    fi
    
    # Check for expected fields
    missing_fields=""
    for field in $expected_fields; do
        if ! echo "$response" | jq -e "$field" >/dev/null 2>&1; then
            missing_fields="$missing_fields $field"
        fi
    done
    
    if [ -z "$missing_fields" ]; then
        echo -e "${GREEN}✓ All fields present${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ Missing fields:$missing_fields${NC}"
        ((FAILED++))
        return 1
    fi
}

# 1. Test Public Endpoints
echo -e "\n${YELLOW}1. Testing Public Endpoints${NC}"
echo "================================"

# Homepage
test_endpoint "GET" "/api/homepage?populate=*" "200" "Homepage API"
validate_structure "/api/homepage?populate=*" ".data .data.attributes" "Homepage structure"

# Artists Work (Products)
test_endpoint "GET" "/api/artists-work?populate=*" "200" "Artists work list"
validate_structure "/api/artists-work?populate=*" ".data .meta.pagination" "Artists work structure"

# Single Product
test_endpoint "GET" "/api/artists-work/1?populate=*" "200" "Single product"

# Artists
test_endpoint "GET" "/api/artist?populate=*" "200" "Artists list"

# Paper Types
test_endpoint "GET" "/api/paper-type" "200" "Paper types"

# 2. Test Authentication Flow
echo -e "\n${YELLOW}2. Testing Authentication Flow${NC}"
echo "================================"

# Register endpoint
REGISTER_DATA='{"username":"test_'$(date +%s)'","email":"test_'$(date +%s)'@example.com","password":"Test123456!"}'
echo -n "Testing user registration: "
REGISTER_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$REGISTER_DATA" "$API_URL/api/auth/local/register")

if echo "$REGISTER_RESPONSE" | jq -e '.jwt' >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Registration successful${NC}"
    ((PASSED++))
    JWT_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.jwt')
    USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id')
else
    echo -e "${RED}✗ Registration failed${NC}"
    ((FAILED++))
fi

# Login endpoint
LOGIN_DATA='{"identifier":"test@example.com","password":"Test123456!"}'
test_endpoint "POST" "/api/auth/local" "200" "User login" "$LOGIN_DATA"

# 3. Test Authenticated Endpoints
echo -e "\n${YELLOW}3. Testing Authenticated Endpoints${NC}"
echo "====================================="

if [ -n "${JWT_TOKEN:-}" ]; then
    # Test cart operations
    echo -n "Testing cart access: "
    CART_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" "$API_URL/api/cart")
    if echo "$CART_RESPONSE" | jq . >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Cart accessible${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Cart not accessible${NC}"
        ((FAILED++))
    fi
    
    # Test user profile
    echo -n "Testing user profile: "
    PROFILE_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" "$API_URL/api/users/me")
    if echo "$PROFILE_RESPONSE" | jq -e '.id' >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Profile accessible${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Profile not accessible${NC}"
        ((FAILED++))
    fi
fi

# 4. Test Search and Filtering
echo -e "\n${YELLOW}4. Testing Search and Filtering${NC}"
echo "=================================="

# Search by title
test_endpoint "GET" "/api/artists-work?filters[title][\$contains]=art" "200" "Search by title"

# Filter by price range
test_endpoint "GET" "/api/artists-work?filters[price][\$gte]=100&filters[price][\$lte]=500" "200" "Filter by price"

# Pagination
test_endpoint "GET" "/api/artists-work?pagination[page]=1&pagination[pageSize]=10" "200" "Pagination"

# Sorting
test_endpoint "GET" "/api/artists-work?sort=price:desc" "200" "Sort by price"

# 5. Test Image URLs
echo -e "\n${YELLOW}5. Testing Image URLs${NC}"
echo "========================"

echo -n "Checking image accessibility: "
IMAGE_CHECK=$(curl -s "$API_URL/api/artists-work?populate=*" | jq -r '.data[0].attributes.images.data[0].attributes.url' 2>/dev/null)

if [ -n "$IMAGE_CHECK" ] && [ "$IMAGE_CHECK" != "null" ]; then
    # Check if image URL is accessible
    if [[ "$IMAGE_CHECK" =~ ^http ]]; then
        IMAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$IMAGE_CHECK")
    else
        IMAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$IMAGE_CHECK")
    fi
    
    if [ "$IMAGE_STATUS" = "200" ]; then
        echo -e "${GREEN}✓ Images accessible${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠ Image not accessible (Status: $IMAGE_STATUS)${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠ No images found${NC}"
    ((WARNINGS++))
fi

# 6. Test Error Handling
echo -e "\n${YELLOW}6. Testing Error Handling${NC}"
echo "==========================="

# 404 handling
test_endpoint "GET" "/api/artists-work/99999" "404" "404 error handling"

# Invalid data
test_endpoint "POST" "/api/auth/local" "400" "Invalid login data" '{"identifier":"invalid"}'

# 7. Performance Checks
echo -e "\n${YELLOW}7. Basic Performance Checks${NC}"
echo "============================="

echo -n "Testing response time for homepage: "
START_TIME=$(date +%s%N)
curl -s "$API_URL/api/homepage?populate=*" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(echo "scale=2; ($END_TIME - $START_TIME) / 1000000" | bc)

if (( $(echo "$RESPONSE_TIME < 500" | bc -l) )); then
    echo -e "${GREEN}✓ Fast response (${RESPONSE_TIME}ms)${NC}"
    ((PASSED++))
elif (( $(echo "$RESPONSE_TIME < 1000" | bc -l) )); then
    echo -e "${YELLOW}⚠ Slow response (${RESPONSE_TIME}ms)${NC}"
    ((WARNINGS++))
else
    echo -e "${RED}✗ Very slow response (${RESPONSE_TIME}ms)${NC}"
    ((FAILED++))
fi

# 8. Generate Integration Contract
echo -e "\n${YELLOW}8. Generating API Contract${NC}"
echo "============================"

CONTRACT_FILE="$TEST_DIR/api-contract.json"
cat > "$CONTRACT_FILE" << EOF
{
  "version": "1.0.0",
  "generated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "endpoints": {
    "public": {
      "homepage": {
        "method": "GET",
        "path": "/api/homepage",
        "params": ["populate"],
        "response": {
          "data": {
            "attributes": {}
          }
        }
      },
      "products": {
        "method": "GET",
        "path": "/api/artists-work",
        "params": ["populate", "filters", "sort", "pagination"],
        "response": {
          "data": [],
          "meta": {
            "pagination": {}
          }
        }
      }
    },
    "authenticated": {
      "cart": {
        "method": "GET",
        "path": "/api/cart",
        "headers": ["Authorization"],
        "response": {
          "data": {}
        }
      },
      "profile": {
        "method": "GET",
        "path": "/api/users/me",
        "headers": ["Authorization"],
        "response": {
          "id": "number",
          "username": "string",
          "email": "string"
        }
      }
    }
  }
}
EOF

echo "API contract saved to: $CONTRACT_FILE"

# 9. Generate Frontend Types (TypeScript)
echo -e "\n${YELLOW}9. Generating TypeScript Types${NC}"
echo "================================"

TYPES_FILE="$TEST_DIR/api-types.ts"
cat > "$TYPES_FILE" << 'EOF'
// Auto-generated API types for frontend integration
// Generated: $(date)

export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiAttributes<T> {
  id: number;
  attributes: T;
}

export interface Product {
  title: string;
  description: string;
  price: number;
  images: StrapiResponse<Image[]>;
  artist: StrapiResponse<Artist>;
  createdAt: string;
  updatedAt: string;
}

export interface Artist {
  name: string;
  bio: string;
  avatar: StrapiResponse<Image>;
}

export interface Image {
  url: string;
  alternativeText?: string;
  width: number;
  height: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  confirmed: boolean;
}

export interface AuthResponse {
  jwt: string;
  user: User;
}
EOF

echo "TypeScript types saved to: $TYPES_FILE"

# Summary Report
echo -e "\n${YELLOW}=== Integration Test Summary ===${NC}"
echo "================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

# Generate detailed report
REPORT_FILE="$TEST_DIR/integration-report-$(date +%Y%m%d-%H%M%S).json"
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "summary": {
    "passed": $PASSED,
    "failed": $FAILED,
    "warnings": $WARNINGS,
    "total": $((PASSED + FAILED))
  },
  "apiUrl": "$API_URL",
  "recommendations": [
    $([ $FAILED -gt 0 ] && echo '"Fix failing endpoints before deployment",')
    $([ $WARNINGS -gt 0 ] && echo '"Review warnings for potential issues",')
    "Implement proper error handling in frontend",
    "Add request/response interceptors for auth",
    "Cache static data endpoints"
  ]
}
EOF

echo -e "\nDetailed report: $REPORT_FILE"

# Exit code
if [ $FAILED -gt 0 ]; then
    exit 2
elif [ $WARNINGS -gt 5 ]; then
    exit 1
else
    exit 0
fi