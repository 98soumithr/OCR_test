#!/bin/bash

# FormPilot Build Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔨 Building FormPilot${NC}"

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
rm -rf dist
mkdir -p dist

# Build extension
echo -e "${GREEN}Building Chrome extension...${NC}"
cd extension
npm install
npm run build
cd ..

# Copy extension build to dist
cp -r extension/dist dist/extension

# Build backend Docker image
echo -e "${GREEN}Building backend Docker image...${NC}"
docker build -t formpilot-backend:latest backend/

# Create distribution package
echo -e "${GREEN}Creating distribution package...${NC}"
cd dist

# Create extension ZIP for Chrome Web Store
zip -r formpilot-extension.zip extension/

# Create deployment package
tar -czf formpilot-backend.tar.gz -C ../backend .

cd ..

echo -e "${GREEN}✅ Build complete!${NC}"
echo -e "Extension: dist/formpilot-extension.zip"
echo -e "Backend: dist/formpilot-backend.tar.gz"