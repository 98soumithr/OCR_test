#!/bin/bash

# FormPilot Quick Setup Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}     FormPilot Setup Script          ${NC}"
echo -e "${GREEN}=====================================${NC}\n"

# Check Python version
echo -e "${YELLOW}Checking Python version...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    echo -e "${GREEN}✓ Python $PYTHON_VERSION found${NC}"
else
    echo -e "${RED}✗ Python 3 not found. Please install Python 3.11+${NC}"
    exit 1
fi

# Check Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js $NODE_VERSION found${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Setup backend
echo -e "\n${YELLOW}Setting up backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing Python dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo -e "${GREEN}✓ Backend setup complete${NC}"

# Setup extension
echo -e "\n${YELLOW}Setting up extension...${NC}"
cd ../extension

echo "Installing Node dependencies..."
npm install --silent

echo "Building extension..."
npm run build --silent

echo -e "${GREEN}✓ Extension setup complete${NC}"

# Create .env file if it doesn't exist
if [ ! -f "../backend/.env" ]; then
    echo -e "\n${YELLOW}Creating .env file...${NC}"
    cat > ../backend/.env << EOF
# FormPilot Configuration
DEBUG=true
OCR_ENGINE=paddleocr
AUTO_FILL_THRESHOLD=0.92
REVIEW_THRESHOLD=0.80
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
fi

# Instructions
echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}     Setup Complete! 🎉              ${NC}"
echo -e "${GREEN}=====================================${NC}\n"

echo -e "${YELLOW}To start FormPilot:${NC}"
echo -e "1. Run the development servers:"
echo -e "   ${GREEN}./scripts/dev.sh${NC}"
echo -e ""
echo -e "2. Load the extension in Chrome:"
echo -e "   - Open ${GREEN}chrome://extensions/${NC}"
echo -e "   - Enable Developer mode"
echo -e "   - Click 'Load unpacked'"
echo -e "   - Select ${GREEN}extension/dist${NC} folder"
echo -e ""
echo -e "3. Test with sample forms:"
echo -e "   Open ${GREEN}samples/test_forms/simple_form.html${NC}"
echo -e ""
echo -e "${YELLOW}For more information:${NC}"
echo -e "   See ${GREEN}README.md${NC}"
echo -e ""
echo -e "${GREEN}Happy form filling! 🚀${NC}"