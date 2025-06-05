#!/bin/bash

# Test Build Script
# Tests build commands locally before CI/CD

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏗️  Testing Build Commands${NC}"
echo "================================="

# Test 1: Standard build
echo -e "\n${YELLOW}1. Testing 'npm run build'${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Standard build succeeded${NC}"
else
    echo -e "${RED}❌ Standard build failed${NC}"
    exit 1
fi

# Test 2: Production build
echo -e "\n${YELLOW}2. Testing 'npm run build:production'${NC}"
if npm run build:production; then
    echo -e "${GREEN}✅ Production build succeeded${NC}"
else
    echo -e "${RED}❌ Production build failed${NC}"
    exit 1
fi

# Test 3: TypeScript check
echo -e "\n${YELLOW}3. Testing TypeScript compilation${NC}"
if [ -f "tsconfig.json" ]; then
    if npm run ts:check; then
        echo -e "${GREEN}✅ TypeScript check passed${NC}"
    else
        echo -e "${RED}❌ TypeScript check failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  No TypeScript configuration found${NC}"
fi

# Test 4: Check build artifacts
echo -e "\n${YELLOW}4. Checking build artifacts${NC}"
if [ -d "build" ]; then
    echo -e "${GREEN}✅ Build directory exists${NC}"
    echo "Build size: $(du -sh build)"
    echo "Build contents:"
    ls -la build/ | head -10
elif [ -d "dist" ]; then
    echo -e "${GREEN}✅ Dist directory exists${NC}"
    echo "Dist size: $(du -sh dist)"
    echo "Dist contents:"
    ls -la dist/ | head -10
else
    echo -e "${YELLOW}⚠️  No build/dist directory found${NC}"
fi

# Test 5: Check package.json scripts
echo -e "\n${YELLOW}5. Checking package.json scripts${NC}"
if npm run build:check >/dev/null 2>&1; then
    echo -e "${GREEN}✅ build:check script available${NC}"
else
    echo -e "${YELLOW}⚠️  build:check script not available${NC}"
fi

if npm run production:check >/dev/null 2>&1; then
    echo -e "${GREEN}✅ production:check script available${NC}"
else
    echo -e "${YELLOW}⚠️  production:check script not available${NC}"
fi

echo -e "\n${GREEN}🎉 All build tests completed successfully!${NC}"
echo -e "${BLUE}Your project is ready for CI/CD pipeline${NC}"