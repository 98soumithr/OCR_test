#!/bin/bash

# FormPilot Build Script
# Builds all components for production

set -e

echo "🔨 Building FormPilot for production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd shared && npm install && cd ..
cd extension && npm install && cd ..

# Build shared types
echo "🔨 Building shared types..."
cd shared && npm run build && cd ..

# Build extension
echo "🔨 Building extension..."
cd extension && npm run build && cd ..

# Install backend dependencies
echo "🐍 Installing backend dependencies..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo "✅ Build completed successfully!"
echo ""
echo "📦 Built components:"
echo "  • Extension: extension/dist/"
echo "  • Backend: backend/ (ready to deploy)"
echo "  • Shared types: shared/dist/"
echo ""
echo "🚀 To deploy:"
echo "  1. Load extension/dist/ in Chrome"
echo "  2. Deploy backend/ to your server"
echo "  3. Update API endpoint in extension settings"