#!/bin/bash
# Cache Optimization and Monitoring
# Analyzes and optimizes Redis cache performance

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🚀 Cache Optimization - $(date)"
echo "================================"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# Redis CLI command
if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD --no-auth-warning"
else
    REDIS_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
fi

# Check Redis connection
echo -e "\n${YELLOW}1. Redis Connection Test${NC}"
if $REDIS_CMD ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis connection successful${NC}"
else
    echo -e "${RED}✗ Redis connection failed${NC}"
    exit 1
fi

# Get Redis info
REDIS_INFO=$($REDIS_CMD INFO)

# Memory usage analysis
echo -e "\n${YELLOW}2. Memory Usage Analysis${NC}"
USED_MEMORY=$(echo "$REDIS_INFO" | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
USED_MEMORY_PEAK=$(echo "$REDIS_INFO" | grep "used_memory_peak_human:" | cut -d: -f2 | tr -d '\r')
MAX_MEMORY=$($REDIS_CMD CONFIG GET maxmemory | tail -1)

echo "Current memory usage: $USED_MEMORY"
echo "Peak memory usage: $USED_MEMORY_PEAK"
echo "Max memory limit: $([ "$MAX_MEMORY" = "0" ] && echo "Unlimited" || echo "$MAX_MEMORY bytes")"

# Calculate memory usage percentage
if [ "$MAX_MEMORY" != "0" ]; then
    USED_BYTES=$(echo "$REDIS_INFO" | grep "used_memory:" | head -1 | cut -d: -f2 | tr -d '\r')
    USAGE_PERCENT=$(echo "scale=2; $USED_BYTES / $MAX_MEMORY * 100" | bc)
    echo "Memory usage: ${USAGE_PERCENT}%"
    
    if (( $(echo "$USAGE_PERCENT > 80" | bc -l) )); then
        echo -e "${RED}⚠ Memory usage is above 80%!${NC}"
    fi
fi

# Cache hit rate analysis
echo -e "\n${YELLOW}3. Cache Hit Rate Analysis${NC}"
KEYSPACE_HITS=$(echo "$REDIS_INFO" | grep "keyspace_hits:" | cut -d: -f2 | tr -d '\r')
KEYSPACE_MISSES=$(echo "$REDIS_INFO" | grep "keyspace_misses:" | cut -d: -f2 | tr -d '\r')

if [ -n "$KEYSPACE_HITS" ] && [ -n "$KEYSPACE_MISSES" ]; then
    TOTAL_OPS=$((KEYSPACE_HITS + KEYSPACE_MISSES))
    if [ $TOTAL_OPS -gt 0 ]; then
        HIT_RATE=$(echo "scale=2; $KEYSPACE_HITS / $TOTAL_OPS * 100" | bc)
        echo "Cache hit rate: ${HIT_RATE}%"
        echo "Total hits: $KEYSPACE_HITS"
        echo "Total misses: $KEYSPACE_MISSES"
        
        if (( $(echo "$HIT_RATE < 80" | bc -l) )); then
            echo -e "${YELLOW}⚠ Cache hit rate is below 80% - consider reviewing cache strategy${NC}"
        else
            echo -e "${GREEN}✓ Good cache hit rate${NC}"
        fi
    fi
fi

# Key analysis
echo -e "\n${YELLOW}4. Key Analysis${NC}"
TOTAL_KEYS=$($REDIS_CMD DBSIZE | cut -d' ' -f1)
echo "Total keys: $TOTAL_KEYS"

# Analyze key patterns
echo -e "\n${BLUE}Key pattern distribution:${NC}"
KEY_PATTERNS=$($REDIS_CMD --scan --pattern "*" | head -1000 | sed 's/:[^:]*$//' | sort | uniq -c | sort -rn | head -10)
echo "$KEY_PATTERNS"

# Find large keys
echo -e "\n${YELLOW}5. Large Keys Analysis${NC}"
echo "Scanning for large keys..."
LARGE_KEYS=$($REDIS_CMD --bigkeys --i 0.1 2>/dev/null | grep -E "Biggest|found" | head -10)
if [ -n "$LARGE_KEYS" ]; then
    echo "$LARGE_KEYS"
fi

# TTL analysis
echo -e "\n${YELLOW}6. TTL Analysis${NC}"
echo "Checking keys without TTL..."
NO_TTL_COUNT=0
SAMPLE_SIZE=100

# Sample keys to check TTL
SAMPLE_KEYS=$($REDIS_CMD --scan --pattern "*" | head -$SAMPLE_SIZE)
for key in $SAMPLE_KEYS; do
    TTL=$($REDIS_CMD TTL "$key")
    if [ "$TTL" = "-1" ]; then
        ((NO_TTL_COUNT++))
    fi
done

if [ $SAMPLE_SIZE -gt 0 ]; then
    NO_TTL_PERCENT=$((NO_TTL_COUNT * 100 / SAMPLE_SIZE))
    echo "Keys without TTL: ${NO_TTL_PERCENT}% (sample of $SAMPLE_SIZE keys)"
    
    if [ $NO_TTL_PERCENT -gt 20 ]; then
        echo -e "${YELLOW}⚠ Many keys don't have TTL set - this can lead to memory issues${NC}"
    fi
fi

# Eviction policy check
echo -e "\n${YELLOW}7. Eviction Policy${NC}"
EVICTION_POLICY=$($REDIS_CMD CONFIG GET maxmemory-policy | tail -1)
echo "Current eviction policy: $EVICTION_POLICY"

if [ "$EVICTION_POLICY" = "noeviction" ]; then
    echo -e "${YELLOW}⚠ No eviction policy set - Redis will return errors when memory is full${NC}"
else
    echo -e "${GREEN}✓ Eviction policy is configured${NC}"
fi

# Performance metrics
echo -e "\n${YELLOW}8. Performance Metrics${NC}"
OPS_PER_SEC=$(echo "$REDIS_INFO" | grep "instantaneous_ops_per_sec:" | cut -d: -f2 | tr -d '\r')
CONNECTED_CLIENTS=$(echo "$REDIS_INFO" | grep "connected_clients:" | cut -d: -f2 | tr -d '\r')
BLOCKED_CLIENTS=$(echo "$REDIS_INFO" | grep "blocked_clients:" | cut -d: -f2 | tr -d '\r')

echo "Operations per second: $OPS_PER_SEC"
echo "Connected clients: $CONNECTED_CLIENTS"
echo "Blocked clients: $BLOCKED_CLIENTS"

# Optimization recommendations
echo -e "\n${YELLOW}9. Optimization Actions${NC}"

# Clear expired keys
echo "Cleaning expired keys..."
EXPIRED_KEYS=$($REDIS_CMD EVAL "local count = 0; for _,k in ipairs(redis.call('keys', '*')) do local ttl = redis.call('ttl', k); if ttl == -2 then redis.call('del', k); count = count + 1; end end; return count" 0)
echo "Removed $EXPIRED_KEYS expired keys"

# Analyze slow commands
echo -e "\n${YELLOW}10. Slow Commands Analysis${NC}"
SLOW_LOG=$($REDIS_CMD SLOWLOG GET 10)
if [ -n "$SLOW_LOG" ] && [ "$SLOW_LOG" != "(empty array)" ]; then
    echo -e "${YELLOW}Recent slow commands detected:${NC}"
    echo "$SLOW_LOG" | head -20
else
    echo -e "${GREEN}✓ No recent slow commands${NC}"
fi

# Generate optimization report
REPORT_DIR=".claude/logs/cache"
mkdir -p $REPORT_DIR
REPORT_FILE="$REPORT_DIR/optimization-$(date +%Y%m%d).json"

cat > $REPORT_FILE << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "memory": {
    "used": "$USED_MEMORY",
    "peak": "$USED_MEMORY_PEAK",
    "limit": "$MAX_MEMORY"
  },
  "performance": {
    "hitRate": "${HIT_RATE:-0}",
    "opsPerSecond": "$OPS_PER_SEC",
    "totalKeys": "$TOTAL_KEYS",
    "connectedClients": "$CONNECTED_CLIENTS"
  },
  "optimization": {
    "expiredKeysRemoved": "$EXPIRED_KEYS",
    "keysWithoutTTL": "$NO_TTL_PERCENT%"
  }
}
EOF

# Automated optimization based on findings
echo -e "\n${YELLOW}Applying Optimizations...${NC}"

# Set memory limit if not set
if [ "$MAX_MEMORY" = "0" ]; then
    echo "Setting memory limit to 1GB..."
    $REDIS_CMD CONFIG SET maxmemory 1gb
    $REDIS_CMD CONFIG SET maxmemory-policy allkeys-lru
    echo -e "${GREEN}✓ Memory limit and eviction policy configured${NC}"
fi

# Save configuration
$REDIS_CMD CONFIG REWRITE

echo -e "\n${GREEN}✓ Cache optimization complete${NC}"
echo "Report saved to: $REPORT_FILE"

# Exit with appropriate code based on hit rate
if [ -n "$HIT_RATE" ] && (( $(echo "$HIT_RATE < 70" | bc -l) )); then
    exit 1
else
    exit 0
fi