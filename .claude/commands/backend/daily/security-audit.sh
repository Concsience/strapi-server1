#!/bin/bash
# Daily Security Audit Script
# Automated security checks for Strapi backend

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔒 Security Audit - $(date)"
echo "================================"

# Initialize counters
WARNINGS=0
ERRORS=0

# Create audit log directory
AUDIT_DIR=".claude/logs/security"
mkdir -p $AUDIT_DIR
AUDIT_LOG="$AUDIT_DIR/audit-$(date +%Y%m%d).log"

# Function to log findings
log_finding() {
    local severity=$1
    local message=$2
    echo "[$(date +%H:%M:%S)] [$severity] $message" >> $AUDIT_LOG
    
    if [ "$severity" = "ERROR" ]; then
        echo -e "${RED}✗ $message${NC}"
        ((ERRORS++))
    elif [ "$severity" = "WARNING" ]; then
        echo -e "${YELLOW}⚠ $message${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓ $message${NC}"
    fi
}

# 1. Check for exposed .env files
echo -e "\n${YELLOW}1. Environment File Security${NC}"
if [ -f .env ]; then
    # Check permissions
    PERM=$(stat -c "%a" .env)
    if [ "$PERM" != "600" ]; then
        log_finding "WARNING" ".env file has insecure permissions: $PERM (should be 600)"
    else
        log_finding "INFO" ".env file permissions are secure"
    fi
    
    # Check for .env in git
    if git ls-files .env --error-unmatch 2>/dev/null; then
        log_finding "ERROR" ".env file is tracked in git!"
    else
        log_finding "INFO" ".env file is not in git"
    fi
fi

# 2. Check for default/weak secrets
echo -e "\n${YELLOW}2. Secret Strength Check${NC}"
if [ -f .env ]; then
    # Check JWT secret length
    JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2)
    if [ ${#JWT_SECRET} -lt 32 ]; then
        log_finding "ERROR" "JWT_SECRET is too short (${#JWT_SECRET} chars, minimum 32)"
    else
        log_finding "INFO" "JWT_SECRET length is secure (${#JWT_SECRET} chars)"
    fi
    
    # Check for default values
    if grep -q "defaultSecret\|changeme\|password123\|admin123" .env; then
        log_finding "ERROR" "Default or weak passwords found in .env"
    else
        log_finding "INFO" "No obvious default passwords found"
    fi
fi

# 3. Check SSL/TLS configuration
echo -e "\n${YELLOW}3. SSL/TLS Configuration${NC}"
if [ -f config/server.js ]; then
    if grep -q "url.*https://" config/server.js; then
        log_finding "INFO" "HTTPS is configured"
    else
        log_finding "WARNING" "HTTPS might not be configured"
    fi
fi

# 4. Check CORS configuration
echo -e "\n${YELLOW}4. CORS Security${NC}"
if [ -f config/middlewares.js ]; then
    if grep -q "origin.*localhost" config/middlewares.js && [ "$NODE_ENV" = "production" ]; then
        log_finding "ERROR" "localhost is allowed in CORS for production!"
    else
        log_finding "INFO" "CORS configuration appears secure"
    fi
fi

# 5. Check for vulnerable dependencies
echo -e "\n${YELLOW}5. Dependency Vulnerabilities${NC}"
if command -v npm &> /dev/null; then
    echo "Running npm audit..."
    NPM_AUDIT=$(npm audit --json 2>/dev/null || true)
    
    if [ -n "$NPM_AUDIT" ]; then
        VULN_COUNT=$(echo "$NPM_AUDIT" | jq '.metadata.vulnerabilities.total' 2>/dev/null || echo "0")
        CRITICAL=$(echo "$NPM_AUDIT" | jq '.metadata.vulnerabilities.critical' 2>/dev/null || echo "0")
        HIGH=$(echo "$NPM_AUDIT" | jq '.metadata.vulnerabilities.high' 2>/dev/null || echo "0")
        
        if [ "$CRITICAL" -gt 0 ]; then
            log_finding "ERROR" "Found $CRITICAL critical vulnerabilities"
        fi
        if [ "$HIGH" -gt 0 ]; then
            log_finding "WARNING" "Found $HIGH high severity vulnerabilities"
        fi
        if [ "$VULN_COUNT" -eq 0 ]; then
            log_finding "INFO" "No known vulnerabilities found"
        fi
    fi
fi

# 6. Check file permissions
echo -e "\n${YELLOW}6. File Permissions${NC}"
# Check for world-writable files
WORLD_WRITABLE=$(find . -type f -perm -002 -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null | head -10)
if [ -n "$WORLD_WRITABLE" ]; then
    log_finding "ERROR" "Found world-writable files"
    echo "$WORLD_WRITABLE" | head -5
else
    log_finding "INFO" "No world-writable files found"
fi

# 7. Check API rate limiting
echo -e "\n${YELLOW}7. API Rate Limiting${NC}"
if grep -q "rateLimiter\|rateLimit" config/middlewares.js 2>/dev/null; then
    log_finding "INFO" "Rate limiting appears to be configured"
else
    log_finding "WARNING" "Rate limiting might not be configured"
fi

# 8. Check authentication configuration
echo -e "\n${YELLOW}8. Authentication Security${NC}"
AUTH_CONFIG="config/plugins.js"
if [ -f "$AUTH_CONFIG" ]; then
    # Check password requirements
    if grep -q "minLength.*8" "$AUTH_CONFIG" 2>/dev/null; then
        log_finding "INFO" "Password minimum length is configured"
    else
        log_finding "WARNING" "Password requirements might be weak"
    fi
fi

# 9. Check for exposed admin panel
echo -e "\n${YELLOW}9. Admin Panel Security${NC}"
ADMIN_PATH=$(grep "ADMIN_PATH" .env 2>/dev/null | cut -d'=' -f2)
if [ -z "$ADMIN_PATH" ] || [ "$ADMIN_PATH" = "/admin" ]; then
    log_finding "WARNING" "Admin panel is using default path (/admin)"
else
    log_finding "INFO" "Admin panel is using custom path"
fi

# 10. Check database security
echo -e "\n${YELLOW}10. Database Security${NC}"
if [ -f config/database.js ]; then
    if grep -q "ssl.*true" config/database.js; then
        log_finding "INFO" "Database SSL is enabled"
    else
        log_finding "WARNING" "Database SSL might not be enabled"
    fi
fi

# 11. Check for security headers
echo -e "\n${YELLOW}11. Security Headers${NC}"
HEADERS_CHECKED=0
if grep -q "contentSecurityPolicy" config/middlewares.js 2>/dev/null; then
    log_finding "INFO" "Content Security Policy is configured"
    ((HEADERS_CHECKED++))
fi
if grep -q "hsts" config/middlewares.js 2>/dev/null; then
    log_finding "INFO" "HSTS is configured"
    ((HEADERS_CHECKED++))
fi
if [ $HEADERS_CHECKED -eq 0 ]; then
    log_finding "WARNING" "Security headers might not be configured"
fi

# 12. Check for sensitive data in logs
echo -e "\n${YELLOW}12. Log Security${NC}"
LOG_FILES=$(find . -name "*.log" -not -path "./node_modules/*" 2>/dev/null | head -10)
if [ -n "$LOG_FILES" ]; then
    SENSITIVE_PATTERN="password\|secret\|token\|api_key\|apikey"
    SENSITIVE_FOUND=false
    
    for log in $LOG_FILES; do
        if grep -i "$SENSITIVE_PATTERN" "$log" 2>/dev/null | head -1; then
            log_finding "ERROR" "Possible sensitive data in log: $log"
            SENSITIVE_FOUND=true
            break
        fi
    done
    
    if [ "$SENSITIVE_FOUND" = false ]; then
        log_finding "INFO" "No obvious sensitive data found in logs"
    fi
fi

# Generate summary report
echo -e "\n${YELLOW}Security Audit Summary${NC}"
echo "================================"
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "Audit log: $AUDIT_LOG"

# Generate JSON report
JSON_REPORT="$AUDIT_DIR/audit-$(date +%Y%m%d).json"
cat > $JSON_REPORT << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "errors": $ERRORS,
  "warnings": $WARNINGS,
  "status": $([ $ERRORS -eq 0 ] && echo '"passed"' || echo '"failed"')
}
EOF

# Exit with appropriate code
if [ $ERRORS -gt 0 ]; then
    echo -e "\n${RED}Security audit failed with $ERRORS errors${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "\n${YELLOW}Security audit completed with $WARNINGS warnings${NC}"
    exit 0
else
    echo -e "\n${GREEN}Security audit passed with no issues${NC}"
    exit 0
fi