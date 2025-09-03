#!/bin/bash

# FormPilot Test Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 Running FormPilot Tests${NC}"

# Backend tests
echo -e "${YELLOW}Running backend tests...${NC}"
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
fi
pytest --cov=. --cov-report=term-missing
cd ..

# Extension tests
echo -e "${YELLOW}Running extension tests...${NC}"
cd extension
npm test
cd ..

# E2E tests with Playwright
echo -e "${YELLOW}Running E2E tests...${NC}"
cd tests
npm install
npx playwright test
cd ..

echo -e "${GREEN}✅ All tests passed!${NC}"