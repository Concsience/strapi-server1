#!/bin/bash
# API Performance Testing
# Load tests and performance benchmarking for Strapi API

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "⚡ API Performance Testing"
echo "========================="

# Configuration
API_URL="${API_URL:-http://localhost:1337}"
CONCURRENT_USERS="${CONCURRENT_USERS:-10}"
DURATION="${DURATION:-30s}"
RATE="${RATE:-50}"

# Check for required tools
echo -e "\n${YELLOW}Checking dependencies...${NC}"
if ! command -v k6 &> /dev/null; then
    echo -e "${YELLOW}Installing k6...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -s https://dl.k6.io/key.gpg | sudo apt-key add -
        echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update && sudo apt-get install k6
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install k6
    else
        echo -e "${RED}Please install k6 manually: https://k6.io/docs/getting-started/installation${NC}"
        exit 1
    fi
fi

# Create test directory
TEST_DIR=".claude/tests/performance"
mkdir -p $TEST_DIR

# Generate k6 test script
echo -e "\n${YELLOW}Generating test scenarios...${NC}"
cat > "$TEST_DIR/api-load-test.js" << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successRate = new Rate('success');
const apiDuration = new Trend('api_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Warm up
    { duration: '1m', target: 50 },   // Ramp up
    { duration: '2m', target: 50 },   // Stay at peak
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],                   // Error rate under 10%
    errors: ['rate<0.1'],                            // Custom error rate
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:1337';

// Test scenarios
export default function () {
  const testUserId = Math.floor(Math.random() * 100) + 1;
  
  // Scenario 1: Homepage data
  let res = http.get(`${BASE_URL}/api/homepage?populate=*`);
  check(res, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage has data': (r) => r.json('data') !== null,
  });
  errorRate.add(res.status !== 200);
  successRate.add(res.status === 200);
  apiDuration.add(res.timings.duration, { endpoint: 'homepage' });
  
  sleep(1);
  
  // Scenario 2: Artists list
  res = http.get(`${BASE_URL}/api/artists-work?populate=*&pagination[limit]=20`);
  check(res, {
    'artists status is 200': (r) => r.status === 200,
    'artists has items': (r) => r.json('data') && r.json('data').length > 0,
  });
  errorRate.add(res.status !== 200);
  successRate.add(res.status === 200);
  apiDuration.add(res.timings.duration, { endpoint: 'artists-work' });
  
  sleep(1);
  
  // Scenario 3: Single product
  const productId = Math.floor(Math.random() * 10) + 1;
  res = http.get(`${BASE_URL}/api/artists-work/${productId}?populate=*`);
  check(res, {
    'product status is 200 or 404': (r) => r.status === 200 || r.status === 404,
  });
  if (res.status === 200) {
    successRate.add(1);
  } else if (res.status !== 404) {
    errorRate.add(1);
  }
  apiDuration.add(res.timings.duration, { endpoint: 'product-detail' });
  
  sleep(1);
  
  // Scenario 4: Search
  res = http.get(`${BASE_URL}/api/artists-work?filters[title][$contains]=art`);
  check(res, {
    'search status is 200': (r) => r.status === 200,
  });
  errorRate.add(res.status !== 200);
  successRate.add(res.status === 200);
  apiDuration.add(res.timings.duration, { endpoint: 'search' });
  
  sleep(2);
}

// Custom summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    '.claude/tests/performance/summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  let summary = '\n=== Performance Test Results ===\n\n';
  
  // Overall stats
  const metrics = data.metrics;
  summary += `Total Requests: ${metrics.http_reqs.values.count}\n`;
  summary += `Failed Requests: ${metrics.http_req_failed.values.passes || 0}\n`;
  summary += `Success Rate: ${((1 - metrics.errors.values.rate) * 100).toFixed(2)}%\n`;
  summary += `Average Duration: ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `P95 Duration: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `P99 Duration: ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  
  return summary;
}
EOF

# Run basic connectivity test
echo -e "\n${YELLOW}Testing API connectivity...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/homepage" | grep -q "200"; then
    echo -e "${GREEN}✓ API is accessible${NC}"
else
    echo -e "${RED}✗ API is not accessible at $API_URL${NC}"
    exit 1
fi

# Run performance test
echo -e "\n${YELLOW}Running performance test...${NC}"
echo "Configuration:"
echo "- API URL: $API_URL"
echo "- Duration: 4 minutes (warm-up + test + cool-down)"
echo "- Peak concurrent users: 50"

k6 run --env API_URL="$API_URL" "$TEST_DIR/api-load-test.js" | tee "$TEST_DIR/test-output.log"

# Analyze results
echo -e "\n${YELLOW}Analyzing results...${NC}"

if [ -f "$TEST_DIR/summary.json" ]; then
    # Extract key metrics
    AVG_DURATION=$(jq '.metrics.http_req_duration.values.avg' "$TEST_DIR/summary.json")
    P95_DURATION=$(jq '.metrics.http_req_duration.values["p(95)"]' "$TEST_DIR/summary.json")
    P99_DURATION=$(jq '.metrics.http_req_duration.values["p(99)"]' "$TEST_DIR/summary.json")
    ERROR_RATE=$(jq '.metrics.errors.values.rate // 0' "$TEST_DIR/summary.json")
    TOTAL_REQUESTS=$(jq '.metrics.http_reqs.values.count' "$TEST_DIR/summary.json")
    
    echo -e "\n${BLUE}Performance Summary:${NC}"
    echo "Total Requests: $TOTAL_REQUESTS"
    echo "Average Response Time: ${AVG_DURATION}ms"
    echo "95th Percentile: ${P95_DURATION}ms"
    echo "99th Percentile: ${P99_DURATION}ms"
    echo "Error Rate: $(echo "$ERROR_RATE * 100" | bc)%"
    
    # Performance grading
    echo -e "\n${BLUE}Performance Grade:${NC}"
    if (( $(echo "$P95_DURATION < 500" | bc -l) )) && (( $(echo "$ERROR_RATE < 0.01" | bc -l) )); then
        echo -e "${GREEN}Grade: A - Excellent performance!${NC}"
        EXIT_CODE=0
    elif (( $(echo "$P95_DURATION < 1000" | bc -l) )) && (( $(echo "$ERROR_RATE < 0.05" | bc -l) )); then
        echo -e "${GREEN}Grade: B - Good performance${NC}"
        EXIT_CODE=0
    elif (( $(echo "$P95_DURATION < 2000" | bc -l) )) && (( $(echo "$ERROR_RATE < 0.1" | bc -l) )); then
        echo -e "${YELLOW}Grade: C - Acceptable performance${NC}"
        EXIT_CODE=1
    else
        echo -e "${RED}Grade: F - Poor performance${NC}"
        EXIT_CODE=2
    fi
    
    # Recommendations
    echo -e "\n${BLUE}Recommendations:${NC}"
    if (( $(echo "$P95_DURATION > 1000" | bc -l) )); then
        echo "- Consider implementing caching for slow endpoints"
        echo "- Review database queries for optimization"
        echo "- Check for N+1 query problems"
    fi
    if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
        echo "- Investigate error sources in application logs"
        echo "- Check database connection pool settings"
        echo "- Review rate limiting configuration"
    fi
else
    echo -e "${RED}Failed to generate test summary${NC}"
    EXIT_CODE=1
fi

# Generate detailed endpoint report
echo -e "\n${YELLOW}Generating endpoint analysis...${NC}"
cat > "$TEST_DIR/endpoint-performance.sh" << 'EOF'
#!/bin/bash
# Individual endpoint testing

endpoints=(
    "/api/homepage?populate=*"
    "/api/artists-work?populate=*"
    "/api/artist?populate=*"
    "/api/productsheet1?populate=*"
    "/api/cart"
    "/api/orders"
)

echo "Endpoint Performance Test"
echo "========================"

for endpoint in "${endpoints[@]}"; do
    echo -n "Testing $endpoint: "
    
    # Run 10 requests and calculate average
    total_time=0
    success=0
    
    for i in {1..10}; do
        response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" "$1$endpoint")
        status=$(echo $response | cut -d',' -f1)
        time=$(echo $response | cut -d',' -f2)
        
        if [ "$status" = "200" ]; then
            ((success++))
            total_time=$(echo "$total_time + $time" | bc)
        fi
        
        sleep 0.1
    done
    
    if [ $success -gt 0 ]; then
        avg_time=$(echo "scale=3; $total_time / $success * 1000" | bc)
        echo "Avg: ${avg_time}ms (${success}/10 successful)"
    else
        echo "FAILED"
    fi
done
EOF

chmod +x "$TEST_DIR/endpoint-performance.sh"
"$TEST_DIR/endpoint-performance.sh" "$API_URL"

# Save test results
echo -e "\n${GREEN}✓ Performance test complete${NC}"
echo "Results saved to: $TEST_DIR/"

exit $EXIT_CODE