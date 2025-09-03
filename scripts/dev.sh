#!/bin/bash

# FormPilot Development Script
# Starts both backend and extension with hot reload

set -e

echo "🚀 Starting FormPilot development environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

if [ ! -d "shared/node_modules" ]; then
    echo "Installing shared dependencies..."
    cd shared && npm install && cd ..
fi

if [ ! -d "extension/node_modules" ]; then
    echo "Installing extension dependencies..."
    cd extension && npm install && cd ..
fi

# Check if Python backend dependencies are installed
if [ ! -d "backend/venv" ]; then
    echo "Setting up Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Build shared types
echo "🔨 Building shared types..."
cd shared && npm run build && cd ..

# Start backend in background
echo "🐍 Starting FastAPI backend..."
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start extension development server
echo "🔧 Starting extension development server..."
cd extension && npm run dev &
EXTENSION_PID=$!
cd ..

echo "✅ Development environment started!"
echo ""
echo "📋 Services running:"
echo "  • Backend API: http://localhost:8000"
echo "  • Extension: Building in extension/dist/"
echo ""
echo "🔧 Next steps:"
echo "  1. Load the extension in Chrome:"
echo "     - Open chrome://extensions/"
echo "     - Enable 'Developer mode'"
echo "     - Click 'Load unpacked' and select 'extension/dist/'"
echo ""
echo "  2. Test the extension on a web form"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $EXTENSION_PID 2>/dev/null || true
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for processes
wait