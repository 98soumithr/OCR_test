#!/bin/bash

# FormPilot Development Setup Script

echo "🚀 Starting FormPilot development environment..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

# Build shared types first
echo "📦 Building shared types..."
cd shared && npm run build
cd ..

# Start backend (try with system Python if venv fails)
echo "🐍 Starting backend..."
cd backend

# Try to create and use virtual environment
if python3 -m venv venv 2>/dev/null; then
    source venv/bin/activate
    pip install -r requirements-minimal.txt
    echo "✅ Using virtual environment"
else
    echo "⚠️  Virtual environment not available, using system Python"
    echo "⚠️  Note: This may require --break-system-packages flag for pip"
fi

# Start FastAPI server in background
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd ..

# Start extension build watcher
echo "🔧 Starting extension build watcher..."
cd extension
npm run dev &
EXTENSION_PID=$!

cd ..

echo "✅ Development environment started!"
echo "📊 Backend API: http://localhost:8000"
echo "🔧 Extension: Load unpacked from ./extension directory"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo "🛑 Stopping services..."; kill $BACKEND_PID $EXTENSION_PID; exit 0' INT
wait