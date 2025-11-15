#!/bin/bash

# Comprehensive App Testing Script
echo "================================"
echo "🌿 My Soulmates - Test Suite"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

# Test function
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_pattern=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$endpoint")
    
    if echo "$response" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((pass_count++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "Response: $response"
        ((fail_count++))
    fi
}

echo "== API Endpoints =="
test_endpoint "GET /plants" "http://localhost:3000/plants" '"id"'
test_endpoint "GET /flowers" "http://localhost:3000/flowers" '"id"'

echo ""
echo "== Database Integrity =="
echo -n "Checking db.json exists... "
if [ -f "data/db.json" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((fail_count++))
fi

echo -n "Checking plants array... "
if grep -q '"plants"' data/db.json; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((fail_count++))
fi

echo -n "Checking flowers array... "
if grep -q '"flowers"' data/db.json; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((fail_count++))
fi

echo -n "Checking owner field in plants... "
if grep -q '"owner"' data/db.json; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((fail_count++))
fi

echo ""
echo "== File Integrity =="
echo -n "Checking server.js syntax... "
if node -c server.js 2>/dev/null; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((fail_count++))
fi

echo -n "Checking public/index.html exists... "
if [ -f "public/index.html" ]; then
    lines=$(wc -l < public/index.html)
    echo -e "${GREEN}✅ PASS${NC} ($lines lines)"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((fail_count++))
fi

echo -n "Checking favicon in HTML... "
if grep -q 'rel="icon"' public/index.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((fail_count++))
fi

echo -n "Checking My Soulmates title... "
if grep -q 'My Soulmates' public/index.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((fail_count++))
fi

echo -n "Checking Amma label... "
if grep -q 'Amma' public/index.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((fail_count++))
fi

echo -n "Checking Ammulu label... "
if grep -q 'Ammulu' public/index.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((fail_count++))
fi

echo -n "Checking owner validation error message... "
if grep -q 'Amma or Ammulu' public/index.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((fail_count++))
fi

echo -n "Checking object-fit contain for images... "
if grep -q 'object-fit: contain' public/index.html; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((fail_count++))
fi

echo ""
echo "== Summary =="
echo -e "Tests Passed: ${GREEN}$pass_count${NC}"
echo -e "Tests Failed: ${RED}$fail_count${NC}"
total=$((pass_count + fail_count))
echo "Total: $total"

if [ $fail_count -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed! App is ready.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please review.${NC}"
    exit 1
fi
