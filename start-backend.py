#!/usr/bin/env python3
"""
Simple backend startup script for FormPilot
This script starts the FastAPI server with minimal dependencies
"""

import sys
import os
import subprocess
import importlib.util

def check_dependency(module_name, package_name=None):
    """Check if a Python module is available"""
    if package_name is None:
        package_name = module_name
    
    spec = importlib.util.find_spec(module_name)
    if spec is None:
        print(f"❌ {package_name} not found")
        return False
    else:
        print(f"✅ {package_name} available")
        return True

def install_minimal_deps():
    """Install minimal dependencies"""
    minimal_deps = [
        "fastapi",
        "uvicorn[standard]", 
        "pydantic",
        "python-multipart",
        "PyMuPDF",
        "pillow",
        "python-dotenv"
    ]
    
    print("📦 Installing minimal dependencies...")
    
    for dep in minimal_deps:
        try:
            subprocess.run([
                sys.executable, "-m", "pip", "install", dep, "--break-system-packages"
            ], check=True, capture_output=True)
            print(f"✅ Installed {dep}")
        except subprocess.CalledProcessError:
            print(f"⚠️  Failed to install {dep}, continuing...")

def main():
    print("🚀 FormPilot Backend Startup")
    
    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    os.chdir(backend_dir)
    
    # Check core dependencies
    deps_ok = True
    deps_ok &= check_dependency("fastapi")
    deps_ok &= check_dependency("uvicorn")
    deps_ok &= check_dependency("pydantic")
    deps_ok &= check_dependency("fitz", "PyMuPDF")
    
    if not deps_ok:
        print("\n⚠️  Some dependencies are missing. Attempting to install...")
        install_minimal_deps()
    
    # Start the server
    print("\n🌟 Starting FormPilot backend on http://localhost:8000")
    print("📖 API docs available at http://localhost:8000/docs")
    print("Press Ctrl+C to stop\n")
    
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000"
        ])
    except KeyboardInterrupt:
        print("\n🛑 Backend stopped")

if __name__ == "__main__":
    main()