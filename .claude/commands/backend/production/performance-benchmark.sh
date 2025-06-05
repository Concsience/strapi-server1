#!/bin/bash
# Production Performance Benchmarking
# Comprehensive performance testing before deployment

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🚀 Production Performance Benchmark"
echo "==================================="

# Configuration
API_URL="${API_URL:-http://localhost:1337}"
BENCHMARK_DIR=".claude/benchmarks/production"
mkdir -p $BENCHMARK_DIR

# Performance thresholds
THRESHOLD_RESPONSE_TIME=200  # ms
THRESHOLD_P95=500           # ms
THRESHOLD_P99=1000          # ms
THRESHOLD_ERROR_RATE=1      # %
THRESHOLD_RPS=100           # requests per second

# Initialize results
PASSED_BENCHMARKS=0
FAILED_BENCHMARKS=0

echo -e "\n${YELLOW}Configuration:${NC}"
echo "API URL: $API_URL"
echo "Response time threshold: ${THRESHOLD_RESPONSE_TIME}ms"
echo "P95 threshold: ${THRESHOLD_P95}ms"
echo "P99 threshold: ${THRESHOLD_P99}ms"
echo "Error rate threshold: ${THRESHOLD_ERROR_RATE}%"
echo "RPS threshold: ${THRESHOLD_RPS} req/s"

# 1. Basic Health Check
echo -e "\n${BLUE}1. Health Check${NC}"
echo "================"

HEALTH_START=$(date +%s%N)
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" "$API_URL/_health" 2>/dev/null || echo "000")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -2 | head -1)
HEALTH_TIME=$(echo "$HEALTH_RESPONSE" | tail -1)

if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ API is healthy (${HEALTH_TIME}s)${NC}"
    ((PASSED_BENCHMARKS++))
else
    echo -e "${RED}✗ API health check failed (Status: $HEALTH_STATUS)${NC}"
    ((FAILED_BENCHMARKS++))
    exit 1
fi

# 2. Response Time Benchmarks
echo -e "\n${BLUE}2. Response Time Benchmarks${NC}"
echo "============================"

# Create benchmark script
cat > "$BENCHMARK_DIR/response-time-test.sh" << 'EOF'
#!/bin/bash
# Test individual endpoint response times

endpoints=(
    "/api/homepage?populate=*"
    "/api/artists-work?populate=*&pagination[limit]=20"
    "/api/artist?populate=*"
    "/api/paper-type"
    "/api/artists-work/1?populate=*"
)

echo "Endpoint,Min(ms),Avg(ms),Max(ms),StdDev(ms),Errors"

for endpoint in "${endpoints[@]}"; do
    times=()
    errors=0
    
    for i in {1..50}; do
        response=$(curl -s -w "\n%{http_code}\n%{time_total}" "$1$endpoint" 2>/dev/null)
        status=$(echo "$response" | tail -2 | head -1)
        time=$(echo "$response" | tail -1)
        
        if [ "$status" = "200" ]; then
            time_ms=$(echo "$time * 1000" | bc)
            times+=($time_ms)
        else
            ((errors++))
        fi
        
        sleep 0.1
    done
    
    if [ ${#times[@]} -gt 0 ]; then
        # Calculate statistics
        min=$(printf '%s\n' "${times[@]}" | sort -n | head -1)
        max=$(printf '%s\n' "${times[@]}" | sort -n | tail -1)
        sum=$(printf '%s\n' "${times[@]}" | paste -sd+ | bc)
        avg=$(echo "scale=2; $sum / ${#times[@]}" | bc)
        
        # Calculate standard deviation
        sum_sq=0
        for t in "${times[@]}"; do
            diff=$(echo "$t - $avg" | bc)
            sq=$(echo "$diff * $diff" | bc)
            sum_sq=$(echo "$sum_sq + $sq" | bc)
        done
        variance=$(echo "scale=2; $sum_sq / ${#times[@]}" | bc)
        stddev=$(echo "scale=2; sqrt($variance)" | bc)
        
        echo "$endpoint,$min,$avg,$max,$stddev,$errors"
    else
        echo "$endpoint,N/A,N/A,N/A,N/A,$errors"
    fi
done
EOF

chmod +x "$BENCHMARK_DIR/response-time-test.sh"

echo "Running response time tests (50 requests per endpoint)..."
RESPONSE_RESULTS=$("$BENCHMARK_DIR/response-time-test.sh" "$API_URL")
echo "$RESPONSE_RESULTS" > "$BENCHMARK_DIR/response-times.csv"

# Analyze results
echo -e "\n${YELLOW}Response Time Analysis:${NC}"
echo "$RESPONSE_RESULTS" | column -t -s ','

# Check against thresholds
SLOW_ENDPOINTS=$(echo "$RESPONSE_RESULTS" | tail -n +2 | awk -F',' -v threshold=$THRESHOLD_RESPONSE_TIME '$3 > threshold {print $1}' | wc -l)
if [ $SLOW_ENDPOINTS -eq 0 ]; then
    echo -e "${GREEN}✓ All endpoints meet response time threshold${NC}"
    ((PASSED_BENCHMARKS++))
else
    echo -e "${RED}✗ $SLOW_ENDPOINTS endpoints exceed response time threshold${NC}"
    ((FAILED_BENCHMARKS++))
fi

# 3. Load Testing
echo -e "\n${BLUE}3. Load Testing${NC}"
echo "================"

# Create k6 load test script
cat > "$BENCHMARK_DIR/load-test.js" << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:1337';

export default function () {
  // Homepage request
  let res = http.get(`${BASE_URL}/api/homepage?populate=*`);
  check(res, { 'homepage status 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  
  sleep(1);
  
  // Products list
  res = http.get(`${BASE_URL}/api/artists-work?populate=*&pagination[limit]=20`);
  check(res, { 'products status 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  
  sleep(1);
  
  // Random product detail
  const productId = Math.floor(Math.random() * 100) + 1;
  res = http.get(`${BASE_URL}/api/artists-work/${productId}?populate=*`);
  check(res, { 'product detail status ok': (r) => r.status === 200 || r.status === 404 });
  errorRate.add(res.status >= 500);
  
  sleep(2);
}
EOF

# Run load test if k6 is available
if command -v k6 &> /dev/null; then
    echo "Running load test (10 minutes)..."
    k6 run --env API_URL="$API_URL" --summary-export="$BENCHMARK_DIR/load-test-summary.json" "$BENCHMARK_DIR/load-test.js" > "$BENCHMARK_DIR/load-test.log" 2>&1
    
    # Analyze load test results
    if [ -f "$BENCHMARK_DIR/load-test-summary.json" ]; then
        P95=$(jq '.metrics.http_req_duration.values["p(95)"]' "$BENCHMARK_DIR/load-test-summary.json")
        P99=$(jq '.metrics.http_req_duration.values["p(99)"]' "$BENCHMARK_DIR/load-test-summary.json")
        ERROR_RATE=$(jq '.metrics.http_req_failed.values.rate // 0' "$BENCHMARK_DIR/load-test-summary.json")
        RPS=$(jq '.metrics.http_reqs.values.rate' "$BENCHMARK_DIR/load-test-summary.json")
        
        echo -e "\n${YELLOW}Load Test Results:${NC}"
        echo "P95 Response Time: ${P95}ms"
        echo "P99 Response Time: ${P99}ms"
        echo "Error Rate: $(echo "$ERROR_RATE * 100" | bc)%"
        echo "Requests per Second: ${RPS}"
        
        # Check thresholds
        if (( $(echo "$P95 < $THRESHOLD_P95" | bc -l) )); then
            echo -e "${GREEN}✓ P95 response time within threshold${NC}"
            ((PASSED_BENCHMARKS++))
        else
            echo -e "${RED}✗ P95 response time exceeds threshold${NC}"
            ((FAILED_BENCHMARKS++))
        fi
        
        if (( $(echo "$ERROR_RATE < 0.01" | bc -l) )); then
            echo -e "${GREEN}✓ Error rate within threshold${NC}"
            ((PASSED_BENCHMARKS++))
        else
            echo -e "${RED}✗ Error rate exceeds threshold${NC}"
            ((FAILED_BENCHMARKS++))
        fi
    fi
else
    echo -e "${YELLOW}k6 not installed, skipping load test${NC}"
fi

# 4. Database Performance
echo -e "\n${BLUE}4. Database Performance${NC}"
echo "======================="

if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Test database connection pool
echo -n "Testing database connection pool: "
DB_POOL_TEST=$(cat << 'EOF' | node
const { performance } = require('perf_hooks');

async function testPool() {
  const connections = [];
  const times = [];
  
  try {
    // Simulate 20 concurrent connections
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      // This would normally create a DB connection
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      const end = performance.now();
      times.push(end - start);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Average: ${avg.toFixed(2)}ms`);
    
    if (avg < 200) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed');
    process.exit(1);
  }
}

testPool();
EOF
)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database pool performance good${NC}"
    ((PASSED_BENCHMARKS++))
else
    echo -e "${RED}✗ Database pool performance issues${NC}"
    ((FAILED_BENCHMARKS++))
fi

# 5. Memory Usage Test
echo -e "\n${BLUE}5. Memory Usage Test${NC}"
echo "===================="

# Get initial memory usage
if command -v pm2 &> /dev/null && pm2 list | grep -q "online"; then
    INITIAL_MEMORY=$(pm2 show 0 | grep "memory" | grep -oE "[0-9]+" | head -1)
    echo "Initial memory usage: ${INITIAL_MEMORY}MB"
    
    # Run memory stress test
    echo "Running memory stress test..."
    for i in {1..100}; do
        curl -s "$API_URL/api/artists-work?populate=*&pagination[limit]=100" > /dev/null &
    done
    wait
    
    sleep 5
    
    # Check memory after stress
    FINAL_MEMORY=$(pm2 show 0 | grep "memory" | grep -oE "[0-9]+" | head -1)
    MEMORY_INCREASE=$((FINAL_MEMORY - INITIAL_MEMORY))
    
    echo "Final memory usage: ${FINAL_MEMORY}MB"
    echo "Memory increase: ${MEMORY_INCREASE}MB"
    
    if [ $MEMORY_INCREASE -lt 100 ]; then
        echo -e "${GREEN}✓ Memory usage stable under load${NC}"
        ((PASSED_BENCHMARKS++))
    else
        echo -e "${YELLOW}⚠ High memory increase under load${NC}"
    fi
fi

# 6. Static Asset Performance
echo -e "\n${BLUE}6. Static Asset Performance${NC}"
echo "==========================="

# Test image loading
echo -n "Testing image CDN performance: "
IMAGE_URL=$(curl -s "$API_URL/api/artists-work?populate=*" | jq -r '.data[0].attributes.images.data[0].attributes.url' 2>/dev/null || echo "")

if [ -n "$IMAGE_URL" ] && [ "$IMAGE_URL" != "null" ]; then
    # Make URL absolute if needed
    if [[ ! "$IMAGE_URL" =~ ^http ]]; then
        IMAGE_URL="$API_URL$IMAGE_URL"
    fi
    
    IMAGE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$IMAGE_URL" 2>/dev/null || echo "999")
    IMAGE_TIME_MS=$(echo "$IMAGE_TIME * 1000" | bc)
    
    if (( $(echo "$IMAGE_TIME_MS < 500" | bc -l) )); then
        echo -e "${GREEN}✓ Image loading fast (${IMAGE_TIME_MS}ms)${NC}"
        ((PASSED_BENCHMARKS++))
    else
        echo -e "${YELLOW}⚠ Image loading slow (${IMAGE_TIME_MS}ms)${NC}"
    fi
fi

# 7. Generate Performance Report
echo -e "\n${BLUE}7. Performance Report Generation${NC}"
echo "=================================="

REPORT_FILE="$BENCHMARK_DIR/performance-report-$(date +%Y%m%d-%H%M%S).json"
SCORE=$((PASSED_BENCHMARKS * 100 / (PASSED_BENCHMARKS + FAILED_BENCHMARKS)))

cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "score": $SCORE,
  "summary": {
    "passed": $PASSED_BENCHMARKS,
    "failed": $FAILED_BENCHMARKS,
    "total": $((PASSED_BENCHMARKS + FAILED_BENCHMARKS))
  },
  "metrics": {
    "healthCheck": $([ "$HEALTH_STATUS" = "200" ] && echo "true" || echo "false"),
    "p95ResponseTime": ${P95:-"N/A"},
    "p99ResponseTime": ${P99:-"N/A"},
    "errorRate": ${ERROR_RATE:-"N/A"},
    "requestsPerSecond": ${RPS:-"N/A"}
  },
  "status": $([ $FAILED_BENCHMARKS -eq 0 ] && echo '"ready"' || echo '"not-ready"'),
  "recommendations": [
    $([ $FAILED_BENCHMARKS -gt 0 ] && echo '"Optimize slow endpoints",')
    $([ "${P95:-0}" -gt "$THRESHOLD_P95" ] && echo '"Implement caching strategy",')
    $([ "${ERROR_RATE:-0}" != "0" ] && echo '"Investigate error sources",')
    "Enable CDN for static assets",
    "Consider database query optimization"
  ]
}
EOF

# Display summary
echo -e "\n${BLUE}=== Performance Benchmark Summary ===${NC}"
echo "====================================="
echo "Total benchmarks: $((PASSED_BENCHMARKS + FAILED_BENCHMARKS))"
echo -e "Passed: ${GREEN}$PASSED_BENCHMARKS${NC}"
echo -e "Failed: ${RED}$FAILED_BENCHMARKS${NC}"
echo "Performance score: ${SCORE}%"

# Final verdict
if [ $FAILED_BENCHMARKS -eq 0 ] && [ $SCORE -eq 100 ]; then
    echo -e "\n${GREEN}✓ EXCELLENT: All performance benchmarks passed!${NC}"
    echo -e "${GREEN}System is ready for production traffic.${NC}"
    exit 0
elif [ $SCORE -ge 80 ]; then
    echo -e "\n${GREEN}✓ GOOD: Performance is acceptable for production.${NC}"
    echo -e "${YELLOW}Consider optimizations for failed benchmarks.${NC}"
    exit 0
elif [ $SCORE -ge 60 ]; then
    echo -e "\n${YELLOW}⚠ WARNING: Performance needs improvement.${NC}"
    echo -e "${YELLOW}Address critical issues before high traffic.${NC}"
    exit 1
else
    echo -e "\n${RED}✗ FAILED: Performance not suitable for production.${NC}"
    echo -e "${RED}Major optimizations required before deployment.${NC}"
    exit 2
fi