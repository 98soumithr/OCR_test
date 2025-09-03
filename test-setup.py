#!/usr/bin/env python3
"""
Test FormPilot setup and basic functionality
"""

import sys
import os
import subprocess
import time
import requests
from pathlib import Path

def test_backend_health():
    """Test if backend is running and healthy"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend healthy: {data}")
            return True
        else:
            print(f"❌ Backend unhealthy: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend not reachable: {e}")
        return False

def test_api_endpoints():
    """Test core API endpoints"""
    base_url = "http://localhost:8000/api/v1"
    
    # Test provider status
    try:
        response = requests.get(f"{base_url}/providers/status")
        if response.status_code == 200:
            providers = response.json()
            print(f"✅ Providers endpoint working: {list(providers.keys())}")
        else:
            print(f"❌ Providers endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Providers endpoint error: {e}")

def test_extension_build():
    """Test if extension is built properly"""
    extension_dist = Path("extension/dist")
    
    required_files = [
        "content-script.js",
        "background.js", 
        "sidebar.html"
    ]
    
    missing_files = []
    for file in required_files:
        if not (extension_dist / file).exists():
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ Extension missing files: {missing_files}")
        print("💡 Run: cd extension && npm run build")
        return False
    else:
        print("✅ Extension build files present")
        return True

def test_shared_types():
    """Test if shared types are built"""
    shared_dist = Path("shared/dist")
    
    if not shared_dist.exists() or not (shared_dist / "index.js").exists():
        print("❌ Shared types not built")
        print("💡 Run: cd shared && npm run build")
        return False
    else:
        print("✅ Shared types built")
        return True

def main():
    print("🧪 FormPilot Setup Test\n")
    
    # Test shared types
    types_ok = test_shared_types()
    
    # Test extension build
    extension_ok = test_extension_build()
    
    # Test backend
    print("\n🔍 Testing backend...")
    backend_ok = test_backend_health()
    
    if backend_ok:
        test_api_endpoints()
    else:
        print("💡 Start backend with: python3 start-backend.py")
    
    # Summary
    print("\n📊 Setup Test Summary:")
    print(f"  Shared Types: {'✅' if types_ok else '❌'}")
    print(f"  Extension Build: {'✅' if extension_ok else '❌'}")  
    print(f"  Backend Health: {'✅' if backend_ok else '❌'}")
    
    if types_ok and extension_ok and backend_ok:
        print("\n🎉 FormPilot setup looks good!")
        print("📝 Next steps:")
        print("  1. Load extension in Chrome (chrome://extensions/)")
        print("  2. Visit any webpage with forms")
        print("  3. Click FormPilot icon to open sidebar")
        print("  4. Upload a PDF and test autofill")
    else:
        print("\n⚠️  Some issues found. Please fix them and run again.")

if __name__ == "__main__":
    main()