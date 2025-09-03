#!/bin/bash

# FormPilot Development Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting FormPilot Development Environment${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    docker-compose down
}

trap cleanup EXIT

# Build and start services
echo -e "${GREEN}Building Docker images...${NC}"
docker-compose build

echo -e "${GREEN}Starting services...${NC}"
docker-compose up -d

# Install dependencies if needed
echo -e "${GREEN}Installing dependencies...${NC}"

# Backend dependencies
if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Extension dependencies
if [ ! -d "extension/node_modules" ]; then
    echo "Installing Node dependencies..."
    cd extension
    npm install
    cd ..
fi

# Start services without Docker (alternative)
echo -e "${GREEN}Starting services locally...${NC}"

# Start backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Start extension
cd extension
npm run dev &
EXTENSION_PID=$!
cd ..

echo -e "${GREEN}✅ FormPilot is running!${NC}"
echo -e "Backend: http://localhost:8000"
echo -e "Extension: http://localhost:3000"
echo -e "\nPress Ctrl+C to stop"

# Wait for processes
wait $BACKEND_PID $EXTENSION_PID