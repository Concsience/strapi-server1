#!/bin/bash
# Pre-commit Security Validation
# Run before committing code to ensure security standards

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔒 Pre-commit Security Check"
echo "============================"

FAILED=0

# Function to check file
check_file() {
    local file=$1
    local issues=0
    
    # Skip binary files
    if file -b "$file" | grep -q "text"; then
        # Check for hardcoded secrets
        if grep -E "(api_key|apikey|api-key|password|passwd|pwd|secret|token|private_key|aws_access_key|PRIVATE)" "$file" | grep -v "process.env" | grep -v "env\(" | grep -vE "example|sample|test|mock" &>/dev/null; then
            echo -e "${RED}✗ Potential hardcoded secret in: $file${NC}"
            ((issues++))
        fi
        
        # Check for console.log in production code
        if [[ "$file" =~ \.(js|ts|jsx|tsx)$ ]] && ! [[ "$file" =~ test|spec|mock ]]; then
            if grep -E "console\.(log|debug|info|warn|error)" "$file" &>/dev/null; then
                echo -e "${YELLOW}⚠ Console statement in: $file${NC}"
                ((issues++))
            fi
        fi
        
        # Check for TODO/FIXME in security-critical files
        if [[ "$file" =~ (auth|security|crypto|password) ]]; then
            if grep -E "(TODO|FIXME|HACK|XXX)" "$file" &>/dev/null; then
                echo -e "${YELLOW}⚠ Unresolved TODO in security file: $file${NC}"
                ((issues++))
            fi
        fi
    fi
    
    return $issues
}

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    echo "No files staged for commit"
    exit 0
fi

# 1. Check for exposed secrets
echo -e "\n${YELLOW}1. Checking for exposed secrets...${NC}"
for file in $STAGED_FILES; do
    if [ -f "$file" ]; then
        check_file "$file" || ((FAILED++))
    fi
done

# 2. Check .env files
echo -e "\n${YELLOW}2. Checking environment files...${NC}"
if echo "$STAGED_FILES" | grep -E "\.env|\.env\." &>/dev/null; then
    echo -e "${RED}✗ Attempting to commit .env file!${NC}"
    echo "Add .env files to .gitignore instead"
    ((FAILED++))
else
    echo -e "${GREEN}✓ No .env files staged${NC}"
fi

# 3. Check package.json for vulnerable dependencies
echo -e "\n${YELLOW}3. Checking dependencies...${NC}"
if echo "$STAGED_FILES" | grep "package.json" &>/dev/null; then
    echo "Running security audit..."
    if npm audit --json 2>/dev/null | jq -e '.metadata.vulnerabilities.critical > 0 or .metadata.vulnerabilities.high > 0' &>/dev/null; then
        echo -e "${RED}✗ Critical or high vulnerabilities found!${NC}"
        echo "Run 'npm audit' for details"
        ((FAILED++))
    else
        echo -e "${GREEN}✓ No critical vulnerabilities${NC}"
    fi
fi

# 4. Check for sensitive file patterns
echo -e "\n${YELLOW}4. Checking for sensitive files...${NC}"
SENSITIVE_PATTERNS=".pem .key .p12 .pfx .cert id_rsa id_dsa"
for pattern in $SENSITIVE_PATTERNS; do
    if echo "$STAGED_FILES" | grep "$pattern" &>/dev/null; then
        echo -e "${RED}✗ Attempting to commit sensitive file type: $pattern${NC}"
        ((FAILED++))
    fi
done

# 5. Check file permissions
echo -e "\n${YELLOW}5. Checking file permissions...${NC}"
for file in $STAGED_FILES; do
    if [ -f "$file" ]; then
        PERMS=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%p" "$file" | tail -c 4)
        if [[ "$PERMS" =~ [0-9][0-9][2367] ]]; then
            echo -e "${YELLOW}⚠ World-writable file: $file (permissions: $PERMS)${NC}"
            ((FAILED++))
        fi
    fi
done

# 6. Run ESLint security plugin if available
echo -e "\n${YELLOW}6. Running linting checks...${NC}"
if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ]; then
    # Only lint staged JS/TS files
    JS_FILES=$(echo "$STAGED_FILES" | grep -E "\.(js|ts|jsx|tsx)$" || true)
    if [ -n "$JS_FILES" ]; then
        if npx eslint $JS_FILES --max-warnings 0 &>/dev/null; then
            echo -e "${GREEN}✓ Linting passed${NC}"
        else
            echo -e "${YELLOW}⚠ Linting warnings found${NC}"
            ((FAILED++))
        fi
    fi
else
    echo "ESLint not configured"
fi

# 7. Check for large files
echo -e "\n${YELLOW}7. Checking file sizes...${NC}"
for file in $STAGED_FILES; do
    if [ -f "$file" ]; then
        SIZE=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
        if [ $SIZE -gt 5242880 ]; then # 5MB
            echo -e "${YELLOW}⚠ Large file: $file ($(($SIZE / 1048576))MB)${NC}"
            ((FAILED++))
        fi
    fi
done

# 8. Validate API schema changes
echo -e "\n${YELLOW}8. Checking API schema changes...${NC}"
SCHEMA_FILES=$(echo "$STAGED_FILES" | grep -E "schema\.json|\.graphql" || true)
if [ -n "$SCHEMA_FILES" ]; then
    echo "Schema files modified - ensure backward compatibility"
    for schema in $SCHEMA_FILES; do
        if [ -f "$schema" ]; then
            # Basic JSON validation
            if ! jq empty "$schema" 2>/dev/null; then
                echo -e "${RED}✗ Invalid JSON in: $schema${NC}"
                ((FAILED++))
            else
                echo -e "${GREEN}✓ Valid JSON: $schema${NC}"
            fi
        fi
    done
fi

# Summary
echo -e "\n================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All security checks passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Security check failed with $FAILED issues${NC}"
    echo -e "\nFix the issues above before committing."
    echo -e "To bypass (NOT RECOMMENDED), use: git commit --no-verify"
    exit 1
fi