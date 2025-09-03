"""
FormPilot Backend - FastAPI service for PDF processing and form field extraction
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from app.routers import parse, preview, providers
from app.services.document_store import DocumentStore

# Load environment variables
load_dotenv()

# Global document store
document_store = DocumentStore()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 FormPilot backend starting up...")
    
    # Initialize ML models
    from app.services.field_extractor import FieldExtractor
    field_extractor = FieldExtractor()
    await field_extractor.initialize()
    app.state.field_extractor = field_extractor
    app.state.document_store = document_store
    
    print("✅ FormPilot backend ready!")
    yield
    
    # Shutdown
    print("🛑 FormPilot backend shutting down...")

# Create FastAPI app
app = FastAPI(
    title="FormPilot API",
    description="PDF processing and form field extraction service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
cors_origins = os.getenv("CORS_ORIGINS", '["http://localhost:3000", "chrome-extension://*"]')
try:
    import json
    origins = json.loads(cors_origins)
except:
    origins = ["http://localhost:3000", "chrome-extension://*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(parse.router, prefix="/api/v1")
app.include_router(preview.router, prefix="/api/v1")
app.include_router(providers.router, prefix="/api/v1")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "FormPilot API is running", "version": "1.0.0"}

@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "field_extractor": hasattr(app.state, 'field_extractor'),
            "document_store": hasattr(app.state, 'document_store')
        }
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    print(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "false").lower() == "true"
    )