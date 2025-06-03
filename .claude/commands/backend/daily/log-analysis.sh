#!/bin/bash
# Log Analysis and Monitoring
# Analyzes application logs for errors, performance issues, and security concerns

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "📊 Log Analysis - $(date)"
echo "================================"

# Configuration
LOG_DIR="${LOG_DIR:-.}"
ANALYSIS_DIR=".claude/logs/analysis"
mkdir -p $ANALYSIS_DIR

# Find all log files
echo -e "\n${YELLOW}1. Locating Log Files${NC}"
LOG_FILES=$(find $LOG_DIR -name "*.log" -type f -mtime -1 -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null || true)

if [ -z "$LOG_FILES" ]; then
    echo -e "${YELLOW}No log files found from the last 24 hours${NC}"
    # Check PM2 logs
    if command -v pm2 &> /dev/null; then
        PM2_LOGS=$(pm2 logs --nostream --lines 0 | grep -oE '/[^ ]+\.log' | sort -u)
        if [ -n "$PM2_LOGS" ]; then
            LOG_FILES="$PM2_LOGS"
            echo "Found PM2 logs: $(echo "$LOG_FILES" | wc -l) files"
        fi
    fi
else
    echo "Found $(echo "$LOG_FILES" | wc -l) log files"
fi

# Initialize counters
TOTAL_ERRORS=0
TOTAL_WARNINGS=0
TOTAL_REQUESTS=0
SECURITY_ISSUES=0

# Analyze each log file
for log_file in $LOG_FILES; do
    if [ ! -f "$log_file" ]; then
        continue
    fi
    
    echo -e "\n${BLUE}Analyzing: $log_file${NC}"
    
    # Count errors and warnings
    ERRORS=$(grep -i "error\|exception\|fatal" "$log_file" 2>/dev/null | wc -l || echo 0)
    WARNINGS=$(grep -i "warning\|warn" "$log_file" 2>/dev/null | wc -l || echo 0)
    
    TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))
    TOTAL_WARNINGS=$((TOTAL_WARNINGS + WARNINGS))
    
    echo "Errors: $ERRORS, Warnings: $WARNINGS"
done

# Detailed error analysis
echo -e "\n${YELLOW}2. Error Analysis${NC}"
if [ $TOTAL_ERRORS -gt 0 ]; then
    echo -e "${RED}Found $TOTAL_ERRORS errors in logs${NC}"
    
    # Find most common errors
    echo -e "\n${BLUE}Most common errors:${NC}"
    for log_file in $LOG_FILES; do
        if [ -f "$log_file" ]; then
            grep -i "error\|exception" "$log_file" 2>/dev/null | \
                sed 's/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}[T ][0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}[.0-9Z]*//g' | \
                sed 's/\[[0-9]*\]//g' | \
                sort | uniq -c | sort -rn | head -5 || true
        fi
    done
else
    echo -e "${GREEN}✓ No errors found${NC}"
fi

# Performance analysis
echo -e "\n${YELLOW}3. Performance Analysis${NC}"

# Analyze response times if available
SLOW_REQUESTS=0
for log_file in $LOG_FILES; do
    if [ -f "$log_file" ]; then
        # Look for response time patterns (e.g., "response_time: 1234ms" or similar)
        SLOW=$(grep -E "response_time.*[0-9]{4,}ms|took.*[0-9]{4,}ms|duration.*[0-9]{4,}" "$log_file" 2>/dev/null | wc -l || echo 0)
        SLOW_REQUESTS=$((SLOW_REQUESTS + SLOW))
    fi
done

if [ $SLOW_REQUESTS -gt 0 ]; then
    echo -e "${YELLOW}Found $SLOW_REQUESTS slow requests (>1000ms)${NC}"
else
    echo -e "${GREEN}✓ No slow requests detected${NC}"
fi

# API endpoint analysis
echo -e "\n${YELLOW}4. API Endpoint Analysis${NC}"
ENDPOINT_STATS_FILE="$ANALYSIS_DIR/endpoint-stats-$(date +%Y%m%d).txt"

for log_file in $LOG_FILES; do
    if [ -f "$log_file" ]; then
        # Extract API endpoints and count requests
        grep -oE "(GET|POST|PUT|DELETE|PATCH) /api/[^ ]+" "$log_file" 2>/dev/null || true
    fi
done | sort | uniq -c | sort -rn > "$ENDPOINT_STATS_FILE"

if [ -s "$ENDPOINT_STATS_FILE" ]; then
    echo "Top 10 most requested endpoints:"
    head -10 "$ENDPOINT_STATS_FILE"
    TOTAL_REQUESTS=$(awk '{sum += $1} END {print sum}' "$ENDPOINT_STATS_FILE")
    echo "Total API requests: $TOTAL_REQUESTS"
fi

# Security analysis
echo -e "\n${YELLOW}5. Security Analysis${NC}"

# Check for authentication failures
AUTH_FAILURES=0
for log_file in $LOG_FILES; do
    if [ -f "$log_file" ]; then
        FAILURES=$(grep -i "unauthorized\|forbidden\|auth.*fail\|login.*fail" "$log_file" 2>/dev/null | wc -l || echo 0)
        AUTH_FAILURES=$((AUTH_FAILURES + FAILURES))
    fi
done

if [ $AUTH_FAILURES -gt 0 ]; then
    echo -e "${YELLOW}Authentication failures: $AUTH_FAILURES${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + AUTH_FAILURES))
else
    echo -e "${GREEN}✓ No authentication failures${NC}"
fi

# Check for potential SQL injection attempts
SQL_INJECTION_ATTEMPTS=0
for log_file in $LOG_FILES; do
    if [ -f "$log_file" ]; then
        ATTEMPTS=$(grep -iE "union.*select|drop.*table|'; *--|\\\\'.*or|<script|javascript:" "$log_file" 2>/dev/null | wc -l || echo 0)
        SQL_INJECTION_ATTEMPTS=$((SQL_INJECTION_ATTEMPTS + ATTEMPTS))
    fi
done

if [ $SQL_INJECTION_ATTEMPTS -gt 0 ]; then
    echo -e "${RED}Potential SQL injection attempts: $SQL_INJECTION_ATTEMPTS${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + SQL_INJECTION_ATTEMPTS))
else
    echo -e "${GREEN}✓ No SQL injection attempts detected${NC}"
fi

# Memory usage analysis
echo -e "\n${YELLOW}6. Memory Usage Analysis${NC}"
if command -v pm2 &> /dev/null && pm2 list | grep -q "online"; then
    PM2_STATUS=$(pm2 show 0 2>/dev/null || true)
    if [ -n "$PM2_STATUS" ]; then
        MEMORY=$(echo "$PM2_STATUS" | grep "memory" | grep -oE "[0-9]+")
        if [ -n "$MEMORY" ]; then
            echo "Current memory usage: ${MEMORY}MB"
            if [ $MEMORY -gt 1000 ]; then
                echo -e "${YELLOW}⚠ High memory usage detected${NC}"
            fi
        fi
    fi
fi

# Database query analysis
echo -e "\n${YELLOW}7. Database Query Analysis${NC}"
SLOW_QUERIES=0
for log_file in $LOG_FILES; do
    if [ -f "$log_file" ]; then
        QUERIES=$(grep -i "slow.*query\|query.*slow\|execution.*time.*[0-9]\{4,\}" "$log_file" 2>/dev/null | wc -l || echo 0)
        SLOW_QUERIES=$((SLOW_QUERIES + QUERIES))
    fi
done

if [ $SLOW_QUERIES -gt 0 ]; then
    echo -e "${YELLOW}Slow database queries: $SLOW_QUERIES${NC}"
else
    echo -e "${GREEN}✓ No slow queries detected${NC}"
fi

# Generate summary report
echo -e "\n${YELLOW}8. Summary Report${NC}"
REPORT_FILE="$ANALYSIS_DIR/daily-report-$(date +%Y%m%d).json"

cat > $REPORT_FILE << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "summary": {
    "totalErrors": $TOTAL_ERRORS,
    "totalWarnings": $TOTAL_WARNINGS,
    "totalRequests": ${TOTAL_REQUESTS:-0},
    "securityIssues": $SECURITY_ISSUES
  },
  "performance": {
    "slowRequests": $SLOW_REQUESTS,
    "slowQueries": $SLOW_QUERIES
  },
  "security": {
    "authFailures": $AUTH_FAILURES,
    "suspiciousActivity": $SQL_INJECTION_ATTEMPTS
  }
}
EOF

# Create alerts if needed
ALERT_FILE="$ANALYSIS_DIR/alerts-$(date +%Y%m%d).txt"
> "$ALERT_FILE"

if [ $TOTAL_ERRORS -gt 100 ]; then
    echo "[CRITICAL] High error rate: $TOTAL_ERRORS errors in 24 hours" >> "$ALERT_FILE"
fi

if [ $SECURITY_ISSUES -gt 10 ]; then
    echo "[SECURITY] Multiple security issues detected: $SECURITY_ISSUES total" >> "$ALERT_FILE"
fi

if [ $SLOW_REQUESTS -gt 50 ]; then
    echo "[PERFORMANCE] High number of slow requests: $SLOW_REQUESTS" >> "$ALERT_FILE"
fi

# Display alerts
if [ -s "$ALERT_FILE" ]; then
    echo -e "\n${RED}🚨 ALERTS:${NC}"
    cat "$ALERT_FILE"
fi

# Cleanup old analysis files (keep last 30 days)
find $ANALYSIS_DIR -name "*.json" -mtime +30 -delete 2>/dev/null || true
find $ANALYSIS_DIR -name "*.txt" -mtime +30 -delete 2>/dev/null || true

echo -e "\n${GREEN}✓ Log analysis complete${NC}"
echo "Reports saved to: $ANALYSIS_DIR"

# Exit code based on severity
if [ $TOTAL_ERRORS -gt 100 ] || [ $SECURITY_ISSUES -gt 10 ]; then
    exit 2
elif [ $TOTAL_ERRORS -gt 0 ] || [ $TOTAL_WARNINGS -gt 50 ]; then
    exit 1
else
    exit 0
fi