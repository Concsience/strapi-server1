#!/bin/bash
# Database Performance Health Check
# Run daily to monitor database performance and health

set -euo pipefail

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Database Health Check - $(date)"
echo "================================"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection info
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-strapi_conscience}"
DB_USER="${DATABASE_USERNAME:-strapi}"

# Function to run PostgreSQL query
run_query() {
    PGPASSWORD=$DATABASE_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "$1"
}

# Check database connection
echo -e "\n${YELLOW}1. Database Connection Test${NC}"
if PGPASSWORD=$DATABASE_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    exit 1
fi

# Check database size
echo -e "\n${YELLOW}2. Database Size${NC}"
DB_SIZE=$(run_query "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
echo "Database size: $DB_SIZE"

# Check table sizes
echo -e "\n${YELLOW}3. Top 10 Largest Tables${NC}"
run_query "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;"

# Check active connections
echo -e "\n${YELLOW}4. Active Connections${NC}"
ACTIVE_CONN=$(run_query "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
IDLE_CONN=$(run_query "SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';")
MAX_CONN=$(run_query "SHOW max_connections;")
echo "Active connections: $ACTIVE_CONN"
echo "Idle connections: $IDLE_CONN"
echo "Max connections: $MAX_CONN"

# Check for long-running queries
echo -e "\n${YELLOW}5. Long-Running Queries (>1 minute)${NC}"
LONG_QUERIES=$(run_query "
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '1 minutes'
AND state != 'idle'
ORDER BY duration DESC
LIMIT 5;")

if [ -z "$LONG_QUERIES" ]; then
    echo -e "${GREEN}✓ No long-running queries${NC}"
else
    echo -e "${RED}Warning: Found long-running queries${NC}"
    echo "$LONG_QUERIES"
fi

# Check for blocking queries
echo -e "\n${YELLOW}6. Blocking Queries${NC}"
BLOCKING=$(run_query "
SELECT 
    blocking.pid AS blocking_pid,
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query
FROM pg_stat_activity AS blocked
JOIN pg_stat_activity AS blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE blocked.pid != blocking.pid;")

if [ -z "$BLOCKING" ]; then
    echo -e "${GREEN}✓ No blocking queries${NC}"
else
    echo -e "${RED}Warning: Found blocking queries${NC}"
    echo "$BLOCKING"
fi

# Check index usage
echo -e "\n${YELLOW}7. Unused Indexes${NC}"
UNUSED_INDEXES=$(run_query "
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename
LIMIT 10;")

if [ -z "$UNUSED_INDEXES" ]; then
    echo -e "${GREEN}✓ All indexes are being used${NC}"
else
    echo -e "${YELLOW}Found unused indexes (consider removing):${NC}"
    echo "$UNUSED_INDEXES"
fi

# Check cache hit ratio
echo -e "\n${YELLOW}8. Cache Hit Ratio${NC}"
CACHE_HIT=$(run_query "
SELECT 
    ROUND(100 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2) as cache_hit_ratio
FROM pg_statio_user_tables;")
echo "Cache hit ratio: ${CACHE_HIT}%"

if (( $(echo "$CACHE_HIT < 90" | bc -l) )); then
    echo -e "${YELLOW}⚠ Cache hit ratio is below 90% - consider increasing shared_buffers${NC}"
else
    echo -e "${GREEN}✓ Cache hit ratio is good${NC}"
fi

# Check for missing indexes (slow queries)
echo -e "\n${YELLOW}9. Potential Missing Indexes${NC}"
MISSING_INDEXES=$(run_query "
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    most_common_vals
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
AND n_distinct > 100
AND most_common_vals IS NULL
LIMIT 5;")

if [ -n "$MISSING_INDEXES" ]; then
    echo -e "${YELLOW}Consider adding indexes for these columns:${NC}"
    echo "$MISSING_INDEXES"
fi

# Vacuum and analyze status
echo -e "\n${YELLOW}10. Vacuum and Analyze Status${NC}"
VACUUM_STATUS=$(run_query "
SELECT 
    schemaname,
    tablename,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY GREATEST(last_vacuum, last_autovacuum, last_analyze, last_autoanalyze) ASC NULLS FIRST
LIMIT 5;")
echo "$VACUUM_STATUS"

# Generate summary report
echo -e "\n${YELLOW}Summary Report${NC}"
echo "================================"

# Write to log file
LOG_DIR=".claude/logs/database"
mkdir -p $LOG_DIR
LOG_FILE="$LOG_DIR/health-check-$(date +%Y%m%d).log"

{
    echo "Database Health Check Report - $(date)"
    echo "Database: $DB_NAME"
    echo "Size: $DB_SIZE"
    echo "Active Connections: $ACTIVE_CONN / $MAX_CONN"
    echo "Cache Hit Ratio: ${CACHE_HIT}%"
    echo "Long-running queries: $(echo "$LONG_QUERIES" | wc -l)"
    echo "Blocking queries: $(echo "$BLOCKING" | wc -l)"
} > $LOG_FILE

echo -e "${GREEN}✓ Health check complete. Report saved to: $LOG_FILE${NC}"

# Exit with appropriate code
if [ -n "$BLOCKING" ] || [ -n "$LONG_QUERIES" ] || (( $(echo "$CACHE_HIT < 90" | bc -l) )); then
    exit 1
else
    exit 0
fi