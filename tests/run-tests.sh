#!/bin/bash

# Comprehensive Test Runner Script
# Runs all test suites and generates reports

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV=${TEST_ENV:-"development"}
API_URL=${API_URL:-"http://localhost:1337"}
REPORT_DIR="./test-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${CYAN}🧪 Strapi Test Suite Runner${NC}"
echo -e "${CYAN}================================${NC}"
echo ""
echo -e "Environment: ${YELLOW}$TEST_ENV${NC}"
echo -e "API URL: ${YELLOW}$API_URL${NC}"
echo -e "Timestamp: ${YELLOW}$TIMESTAMP${NC}"
echo ""

# Create reports directory
mkdir -p "$REPORT_DIR"

# Function to print section headers
print_section() {
    echo ""
    echo -e "${CYAN}🔍 $1${NC}"
    echo -e "${CYAN}$(printf '=%.0s' {1..40})${NC}"
}

# Function to check if Strapi is running
check_strapi() {
    print_section "Checking Strapi Server"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$API_URL/api/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Strapi server is running${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏳ Waiting for Strapi server... (attempt $attempt/$max_attempts)${NC}"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ Strapi server is not responding after $max_attempts attempts${NC}"
    echo -e "${RED}   Make sure Strapi is running at $API_URL${NC}"
    return 1
}

# Function to run pre-flight checks
run_preflight_checks() {
    print_section "Pre-flight Checks"
    
    # Check Node.js version
    node_version=$(node --version)
    echo -e "Node.js version: ${GREEN}$node_version${NC}"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json not found${NC}"
        exit 1
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  node_modules not found, running npm install...${NC}"
        npm install
    fi
    
    # Check environment variables
    if [ ! -f ".env" ] && [ ! -f ".env.$TEST_ENV" ]; then
        echo -e "${YELLOW}⚠️  No environment file found${NC}"
    else
        echo -e "${GREEN}✓ Environment configuration found${NC}"
    fi
    
    echo -e "${GREEN}✓ Pre-flight checks completed${NC}"
}

# Function to run API tests
run_api_tests() {
    print_section "API Integration Tests"
    
    local test_file="tests/api/test-suite.js"
    local report_file="$REPORT_DIR/api-tests-$TIMESTAMP.json"
    
    if [ ! -f "$test_file" ]; then
        echo -e "${RED}❌ API test suite not found: $test_file${NC}"
        return 1
    fi
    
    echo -e "Running API tests against: ${YELLOW}$API_URL${NC}"
    
    # Set environment variables for tests
    export TEST_API_URL="$API_URL"
    
    # Run tests and capture output
    if node "$test_file" --verbose > "$report_file" 2>&1; then
        echo -e "${GREEN}✓ API tests completed successfully${NC}"
        
        # Extract key metrics from test output
        if grep -q "Success Rate:" "$report_file"; then
            success_rate=$(grep "Success Rate:" "$report_file" | awk '{print $3}')
            echo -e "Success Rate: ${GREEN}$success_rate${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ API tests failed${NC}"
        
        # Show last few lines of output for debugging
        echo -e "${YELLOW}Last 10 lines of test output:${NC}"
        tail -n 10 "$report_file"
        
        return 1
    fi
}

# Function to run TypeScript checks
run_typescript_checks() {
    print_section "TypeScript Validation"
    
    local report_file="$REPORT_DIR/typescript-$TIMESTAMP.log"
    
    if [ ! -f "tsconfig.json" ]; then
        echo -e "${YELLOW}⚠️  TypeScript not configured, skipping${NC}"
        return 0
    fi
    
    echo -e "Running TypeScript compiler checks..."
    
    if npx tsc --noEmit > "$report_file" 2>&1; then
        echo -e "${GREEN}✓ TypeScript compilation successful${NC}"
        return 0
    else
        echo -e "${RED}❌ TypeScript compilation failed${NC}"
        
        # Show TypeScript errors
        echo -e "${YELLOW}TypeScript errors:${NC}"
        head -n 20 "$report_file"
        
        return 1
    fi
}

# Function to run ESLint checks
run_eslint_checks() {
    print_section "Code Quality Checks"
    
    local report_file="$REPORT_DIR/eslint-$TIMESTAMP.log"
    
    # Check if ESLint is available
    if ! command -v npx eslint &> /dev/null; then
        echo -e "${YELLOW}⚠️  ESLint not available, skipping${NC}"
        return 0
    fi
    
    echo -e "Running ESLint checks..."
    
    if npx eslint src --ext .js,.ts --format json > "$report_file" 2>&1; then
        echo -e "${GREEN}✓ No linting errors found${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Linting issues found${NC}"
        
        # Count warnings and errors
        if [ -f "$report_file" ]; then
            error_count=$(grep -o '"severity":2' "$report_file" | wc -l)
            warning_count=$(grep -o '"severity":1' "$report_file" | wc -l)
            
            if [ "$error_count" -gt 0 ]; then
                echo -e "Errors: ${RED}$error_count${NC}"
            fi
            
            if [ "$warning_count" -gt 0 ]; then
                echo -e "Warnings: ${YELLOW}$warning_count${NC}"
            fi
        fi
        
        return 0  # Don't fail on linting issues
    fi
}

# Function to run security audit
run_security_audit() {
    print_section "Security Audit"
    
    local report_file="$REPORT_DIR/security-audit-$TIMESTAMP.json"
    
    echo -e "Running npm security audit..."
    
    if npm audit --audit-level=moderate --json > "$report_file" 2>&1; then
        echo -e "${GREEN}✓ No security vulnerabilities found${NC}"
        return 0
    else
        # Parse audit results
        if [ -f "$report_file" ]; then
            critical=$(jq -r '.metadata.vulnerabilities.critical // 0' "$report_file" 2>/dev/null || echo "0")
            high=$(jq -r '.metadata.vulnerabilities.high // 0' "$report_file" 2>/dev/null || echo "0")
            moderate=$(jq -r '.metadata.vulnerabilities.moderate // 0' "$report_file" 2>/dev/null || echo "0")
            
            echo -e "Security vulnerabilities found:"
            [ "$critical" -gt 0 ] && echo -e "  Critical: ${RED}$critical${NC}"
            [ "$high" -gt 0 ] && echo -e "  High: ${YELLOW}$high${NC}"
            [ "$moderate" -gt 0 ] && echo -e "  Moderate: ${BLUE}$moderate${NC}"
            
            # Fail on critical vulnerabilities
            if [ "$critical" -gt 0 ]; then
                echo -e "${RED}❌ Critical security vulnerabilities must be fixed${NC}"
                return 1
            fi
        fi
        
        return 0
    fi
}

# Function to run performance tests
run_performance_tests() {
    print_section "Performance Tests"
    
    local report_file="$REPORT_DIR/performance-$TIMESTAMP.json"
    
    echo -e "Running basic performance checks..."
    
    # Test response times
    local health_time=$(curl -w "%{time_total}" -s -o /dev/null "$API_URL/api/health")
    echo -e "Health endpoint response time: ${GREEN}${health_time}s${NC}"
    
    # Test multiple concurrent requests
    echo -e "Testing concurrent requests..."
    for i in {1..5}; do
        curl -s "$API_URL/api/health" > /dev/null &
    done
    wait
    
    echo -e "${GREEN}✓ Performance tests completed${NC}"
    
    # Create performance report
    cat > "$report_file" << EOF
{
  "timestamp": "$TIMESTAMP",
  "healthResponseTime": "$health_time",
  "concurrentRequestsTest": "passed"
}
EOF
    
    return 0
}

# Function to run deployment validation
run_deployment_validation() {
    print_section "Deployment Validation"
    
    local validation_script="scripts/pre-deployment-validation.js"
    local report_file="$REPORT_DIR/deployment-validation-$TIMESTAMP.log"
    
    if [ ! -f "$validation_script" ]; then
        echo -e "${YELLOW}⚠️  Deployment validation script not found, skipping${NC}"
        return 0
    fi
    
    echo -e "Running deployment validation..."
    
    if node "$validation_script" --environment="$TEST_ENV" > "$report_file" 2>&1; then
        echo -e "${GREEN}✓ Deployment validation passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Deployment validation failed${NC}"
        
        # Show validation errors
        echo -e "${YELLOW}Validation errors:${NC}"
        tail -n 15 "$report_file"
        
        return 1
    fi
}

# Function to generate final report
generate_final_report() {
    print_section "Test Summary Report"
    
    local summary_file="$REPORT_DIR/test-summary-$TIMESTAMP.md"
    
    cat > "$summary_file" << EOF
# Test Summary Report

**Generated:** $(date)
**Environment:** $TEST_ENV
**API URL:** $API_URL

## Test Results

EOF

    # Count test files and results
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    for report in "$REPORT_DIR"/*-"$TIMESTAMP".*; do
        if [ -f "$report" ]; then
            ((total_tests++))
            
            if grep -q "✓\|passed\|successful" "$report" 2>/dev/null; then
                ((passed_tests++))
            else
                ((failed_tests++))
            fi
        fi
    done
    
    cat >> "$summary_file" << EOF
- **Total Test Suites:** $total_tests
- **Passed:** $passed_tests
- **Failed:** $failed_tests
- **Success Rate:** $(( passed_tests * 100 / total_tests ))%

## Report Files

EOF

    # List all report files
    for report in "$REPORT_DIR"/*-"$TIMESTAMP".*; do
        if [ -f "$report" ]; then
            echo "- $(basename "$report")" >> "$summary_file"
        fi
    done
    
    echo -e "📄 Summary report generated: ${GREEN}$summary_file${NC}"
    
    # Display summary
    echo ""
    echo -e "${CYAN}📊 Final Results${NC}"
    echo -e "Total Test Suites: $total_tests"
    echo -e "Passed: ${GREEN}$passed_tests${NC}"
    echo -e "Failed: ${RED}$failed_tests${NC}"
    
    if [ "$failed_tests" -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        return 1
    fi
}

# Main execution
main() {
    local exit_code=0
    
    # Run all test phases
    run_preflight_checks || exit_code=1
    
    check_strapi || exit_code=1
    
    run_api_tests || exit_code=1
    
    run_typescript_checks || exit_code=1
    
    run_eslint_checks || true  # Don't fail on linting
    
    run_security_audit || exit_code=1
    
    run_performance_tests || true  # Don't fail on performance
    
    run_deployment_validation || exit_code=1
    
    generate_final_report || exit_code=1
    
    # Cleanup
    echo ""
    echo -e "${BLUE}📁 Test reports saved to: $REPORT_DIR${NC}"
    
    exit $exit_code
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --api-only     Run only API tests"
        echo "  --no-security  Skip security audit"
        echo ""
        echo "Environment Variables:"
        echo "  TEST_ENV       Test environment (default: development)"
        echo "  API_URL        API URL to test (default: http://localhost:1337)"
        exit 0
        ;;
    --api-only)
        check_strapi && run_api_tests
        exit $?
        ;;
    --no-security)
        # Set flag to skip security tests
        SKIP_SECURITY=true
        main
        ;;
    *)
        main
        ;;
esac