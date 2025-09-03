#!/usr/bin/env python3
"""
Simple test to verify FormPilot setup
"""

import os
import sys
from pathlib import Path

def test_files_exist():
    """Test that all required files exist"""
    required_files = [
        "package.json",
        "shared/dist/index.js",
        "extension/dist/content-script.js",
        "extension/dist/background.js", 
        "extension/manifest.json",
        "backend/main.py",
        "backend/app/routers/parse.py"
    ]
    
    print("📁 Checking file structure...")
    all_exist = True
    
    for file_path in required_files:
        if Path(file_path).exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path}")
            all_exist = False
    
    return all_exist

def test_python_imports():
    """Test that core Python modules can be imported"""
    modules = ["fastapi", "uvicorn", "pydantic"]
    
    print("\n🐍 Checking Python dependencies...")
    all_imported = True
    
    for module in modules:
        try:
            __import__(module)
            print(f"✅ {module}")
        except ImportError:
            print(f"❌ {module}")
            all_imported = False
    
    return all_imported

def main():
    print("🧪 FormPilot Simple Setup Test\n")
    
    files_ok = test_files_exist()
    python_ok = test_python_imports()
    
    print(f"\n📊 Results:")
    print(f"  File Structure: {'✅' if files_ok else '❌'}")
    print(f"  Python Deps: {'✅' if python_ok else '❌'}")
    
    if files_ok and python_ok:
        print("\n🎉 Basic setup looks good!")
        print("🚀 Try starting the backend: python3 start-backend.py")
    else:
        print("\n⚠️  Setup issues found.")
        if not files_ok:
            print("💡 Run: npm run build")
        if not python_ok:
            print("💡 Install Python deps: pip install fastapi uvicorn pydantic --break-system-packages")

if __name__ == "__main__":
    main()