#!/bin/bash

# Generate placeholder icons for FormPilot extension
# In production, replace these with proper designed icons

# Create icons directory if it doesn't exist
mkdir -p /workspace/formpilot/extension/icons

# Generate SVG icon
cat > /workspace/formpilot/extension/icons/icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="16" fill="#667eea"/>
  <path d="M32 48h64v8H32zm0 16h48v8H32zm0 16h64v8H32z" fill="white"/>
  <circle cx="96" cy="96" r="16" fill="#22c55e"/>
  <path d="M88 96l6 6 12-12" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
EOF

echo "✅ Icon placeholder created. Replace with actual icons for production."
echo "Required sizes: 16x16, 32x32, 48x48, 128x128"
echo "Use a tool like ImageMagick or online converter to generate PNG versions"