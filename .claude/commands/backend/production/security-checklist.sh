#!/bin/bash
# Production Security Checklist
# Comprehensive security validation before deployment

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔐 Production Security Checklist"
echo "================================"
echo "Running comprehensive security validation..."

# Initialize scoring
TOTAL_CHECKS=0
PASSED_CHECKS=0
CRITICAL_ISSUES=0

# Results file
RESULTS_DIR=".claude/security/production"
mkdir -p $RESULTS_DIR
RESULTS_FILE="$RESULTS_DIR/checklist-$(date +%Y%m%d-%H%M%S).txt"

# Function to perform check
check() {
    local status=$1
    local message=$2
    local severity=${3:-"INFO"}
    
    ((TOTAL_CHECKS++))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓ $message${NC}"
        ((PASSED_CHECKS++))
        echo "[PASS] $message" >> $RESULTS_FILE
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠ $message${NC}"
        echo "[WARN] $message" >> $RESULTS_FILE
    else
        echo -e "${RED}✗ $message${NC}"
        echo "[FAIL] $message" >> $RESULTS_FILE
        if [ "$severity" = "CRITICAL" ]; then
            ((CRITICAL_ISSUES++))
        fi
    fi
}

# 1. Environment Configuration
echo -e "\n${BLUE}1. Environment Configuration${NC}"
echo "=============================="

# Check for production .env
if [ -f .env.production ]; then
    check "PASS" "Production environment file exists"
    
    # Check NODE_ENV
    if grep -q "NODE_ENV=production" .env.production; then
        check "PASS" "NODE_ENV set to production"
    else
        check "FAIL" "NODE_ENV not set to production" "CRITICAL"
    fi
else
    check "FAIL" "No production environment file found" "CRITICAL"
fi

# Check for exposed secrets in git
if git ls-files | grep -E "\.env|\.env\.production|\.env\.local" | grep -v ".example"; then
    check "FAIL" "Environment files tracked in git!" "CRITICAL"
else
    check "PASS" "Environment files not in git"
fi

# 2. Secret Strength Validation
echo -e "\n${BLUE}2. Secret Strength Validation${NC}"
echo "=============================="

if [ -f .env.production ] || [ -f .env ]; then
    ENV_FILE="${ENV_FILE:-.env.production}"
    [ ! -f "$ENV_FILE" ] && ENV_FILE=".env"
    
    # JWT Secret length
    JWT_SECRET=$(grep "^JWT_SECRET=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2)
    if [ ${#JWT_SECRET} -ge 64 ]; then
        check "PASS" "JWT_SECRET is strong (${#JWT_SECRET} chars)"
    else
        check "FAIL" "JWT_SECRET too weak (${#JWT_SECRET} chars, need 64+)" "CRITICAL"
    fi
    
    # Admin JWT Secret
    ADMIN_JWT=$(grep "^ADMIN_JWT_SECRET=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2)
    if [ ${#ADMIN_JWT} -ge 64 ]; then
        check "PASS" "ADMIN_JWT_SECRET is strong"
    else
        check "FAIL" "ADMIN_JWT_SECRET too weak" "CRITICAL"
    fi
    
    # Database password strength
    DB_PASS=$(grep "^DATABASE_PASSWORD=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2)
    if [ ${#DB_PASS} -ge 16 ] && echo "$DB_PASS" | grep -q '[!@#$%^&*()]'; then
        check "PASS" "Database password is strong"
    else
        check "WARN" "Database password could be stronger"
    fi
fi

# 3. SSL/TLS Configuration
echo -e "\n${BLUE}3. SSL/TLS Configuration${NC}"
echo "========================="

# Check for HTTPS in server config
if grep -q "url.*https://" config/server.js 2>/dev/null || grep -q "URL.*https://" .env.production 2>/dev/null; then
    check "PASS" "HTTPS configured for production"
else
    check "FAIL" "HTTPS not configured" "CRITICAL"
fi

# Check database SSL
if grep -q "ssl.*true" config/env/production/database.js 2>/dev/null; then
    check "PASS" "Database SSL enabled"
else
    check "WARN" "Database SSL not explicitly enabled"
fi

# 4. Authentication & Authorization
echo -e "\n${BLUE}4. Authentication & Authorization${NC}"
echo "===================================="

# Check for custom admin path
if grep -q "ADMIN_PATH=" .env.production 2>/dev/null && ! grep -q "ADMIN_PATH=/admin" .env.production 2>/dev/null; then
    check "PASS" "Custom admin panel path configured"
else
    check "WARN" "Using default admin path (/admin)"
fi

# Check password policy
if [ -f config/plugins.js ]; then
    if grep -q "minLength.*[8-9]" config/plugins.js || grep -q "minLength.*[0-9][0-9]" config/plugins.js; then
        check "PASS" "Strong password policy configured"
    else
        check "WARN" "Password policy might be weak"
    fi
fi

# 5. API Security
echo -e "\n${BLUE}5. API Security${NC}"
echo "================"

# Check CORS configuration
if [ -f config/env/production/middlewares.js ]; then
    if grep -q "localhost" config/env/production/middlewares.js; then
        check "FAIL" "localhost in production CORS!" "CRITICAL"
    else
        check "PASS" "CORS properly configured"
    fi
    
    # Check rate limiting
    if grep -q "rateLimiter\|rate-limit" config/env/production/middlewares.js; then
        check "PASS" "Rate limiting configured"
    else
        check "FAIL" "No rate limiting configured" "CRITICAL"
    fi
else
    check "WARN" "No production middleware configuration found"
fi

# 6. Security Headers
echo -e "\n${BLUE}6. Security Headers${NC}"
echo "===================="

HEADERS_FOUND=0
if [ -f config/env/production/middlewares.js ]; then
    # Check CSP
    if grep -q "contentSecurityPolicy" config/env/production/middlewares.js; then
        check "PASS" "Content Security Policy configured"
        ((HEADERS_FOUND++))
    else
        check "WARN" "No Content Security Policy"
    fi
    
    # Check HSTS
    if grep -q "hsts" config/env/production/middlewares.js; then
        check "PASS" "HSTS configured"
        ((HEADERS_FOUND++))
    else
        check "FAIL" "HSTS not configured" "CRITICAL"
    fi
    
    # Check other headers
    if grep -q "frameguard\|xssFilter\|noSniff" config/env/production/middlewares.js; then
        check "PASS" "Additional security headers configured"
        ((HEADERS_FOUND++))
    fi
fi

if [ $HEADERS_FOUND -eq 0 ]; then
    check "FAIL" "No security headers configured" "CRITICAL"
fi

# 7. File Permissions
echo -e "\n${BLUE}7. File Permissions${NC}"
echo "===================="

# Check for world-writable files
WORLD_WRITABLE=$(find . -type f -perm -002 -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null | wc -l)
if [ $WORLD_WRITABLE -eq 0 ]; then
    check "PASS" "No world-writable files"
else
    check "FAIL" "Found $WORLD_WRITABLE world-writable files" "CRITICAL"
fi

# Check .env permissions
if [ -f .env.production ]; then
    PERM=$(stat -c "%a" .env.production 2>/dev/null || stat -f "%p" .env.production | tail -c 4)
    if [ "$PERM" = "600" ] || [ "$PERM" = "400" ]; then
        check "PASS" "Environment file has secure permissions"
    else
        check "WARN" "Environment file permissions could be stricter ($PERM)"
    fi
fi

# 8. Dependencies Security
echo -e "\n${BLUE}8. Dependencies Security${NC}"
echo "=========================="

# Run npm audit
echo "Running dependency audit..."
NPM_AUDIT=$(npm audit --json 2>/dev/null || echo '{}')
CRITICAL_VULNS=$(echo "$NPM_AUDIT" | jq '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo 0)
HIGH_VULNS=$(echo "$NPM_AUDIT" | jq '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo 0)

if [ "$CRITICAL_VULNS" -eq 0 ]; then
    check "PASS" "No critical vulnerabilities"
else
    check "FAIL" "$CRITICAL_VULNS critical vulnerabilities found" "CRITICAL"
fi

if [ "$HIGH_VULNS" -eq 0 ]; then
    check "PASS" "No high severity vulnerabilities"
else
    check "WARN" "$HIGH_VULNS high severity vulnerabilities"
fi

# 9. Logging & Monitoring
echo -e "\n${BLUE}9. Logging & Monitoring${NC}"
echo "========================="

# Check log configuration
if grep -q "LOG_LEVEL=warn\|LOG_LEVEL=error" .env.production 2>/dev/null; then
    check "PASS" "Production log level configured"
else
    check "WARN" "Consider setting appropriate log level"
fi

# Check for console.log in production code
CONSOLE_LOGS=$(find src -name "*.js" -type f -exec grep -l "console\.log" {} \; 2>/dev/null | wc -l)
if [ $CONSOLE_LOGS -eq 0 ]; then
    check "PASS" "No console.log in source code"
else
    check "WARN" "Found console.log in $CONSOLE_LOGS files"
fi

# 10. Backup & Recovery
echo -e "\n${BLUE}10. Backup & Recovery${NC}"
echo "======================="

# Check for backup configuration
if grep -q "BACKUP_ENABLED=true" .env.production 2>/dev/null; then
    check "PASS" "Backup configuration found"
else
    check "WARN" "No backup configuration found"
fi

# Generate Security Score
echo -e "\n${BLUE}Security Score Calculation${NC}"
echo "==========================="

SCORE=$(echo "scale=2; ($PASSED_CHECKS / $TOTAL_CHECKS) * 100" | bc)
echo "Security Score: ${SCORE}%"
echo "Critical Issues: $CRITICAL_ISSUES"

# Generate detailed report
REPORT_FILE="$RESULTS_DIR/security-report-$(date +%Y%m%d-%H%M%S).json"
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "score": $SCORE,
  "summary": {
    "totalChecks": $TOTAL_CHECKS,
    "passedChecks": $PASSED_CHECKS,
    "criticalIssues": $CRITICAL_ISSUES
  },
  "status": $([ $CRITICAL_ISSUES -eq 0 ] && echo '"ready"' || echo '"not-ready"'),
  "recommendation": $([ $CRITICAL_ISSUES -eq 0 ] && echo '"Safe to deploy"' || echo '"Fix critical issues before deployment"')
}
EOF

# Display final result
echo -e "\n${BLUE}=== Final Assessment ===${NC}"
if [ $CRITICAL_ISSUES -eq 0 ] && [ $SCORE == "100.00" ]; then
    echo -e "${GREEN}✓ EXCELLENT: All security checks passed!${NC}"
    echo -e "${GREEN}System is ready for production deployment.${NC}"
    exit 0
elif [ $CRITICAL_ISSUES -eq 0 ] && (( $(echo "$SCORE >= 80" | bc -l) )); then
    echo -e "${GREEN}✓ GOOD: Security assessment passed with minor warnings.${NC}"
    echo -e "${YELLOW}Review warnings before deployment.${NC}"
    exit 0
elif [ $CRITICAL_ISSUES -eq 0 ]; then
    echo -e "${YELLOW}⚠ ACCEPTABLE: No critical issues, but improvements needed.${NC}"
    echo -e "${YELLOW}Score: ${SCORE}% - Review all warnings.${NC}"
    exit 1
else
    echo -e "${RED}✗ FAILED: Critical security issues found!${NC}"
    echo -e "${RED}$CRITICAL_ISSUES critical issues must be fixed before deployment.${NC}"
    echo -e "${RED}Security score: ${SCORE}%${NC}"
    exit 2
fi