"""
FormPilot Backend - PDF extraction and processing service
"""

import os
import logging
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

from extraction.parser import PDFParser
from extraction.preview import PDFPreviewGenerator
from models import ExtractedData, CloudProviderConfig
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create upload directory
UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    logger.info("Starting FormPilot backend...")
    # Initialize models on startup
    from extraction.embeddings import EmbeddingMatcher
    EmbeddingMatcher.initialize()
    yield
    logger.info("Shutting down FormPilot backend...")

app = FastAPI(
    title="FormPilot Backend",
    description="PDF extraction and form filling service",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*", "http://localhost:*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ParseRequest(BaseModel):
    use_cloud: bool = False
    cloud_provider: Optional[str] = None
    confidence_threshold: float = 0.5

class PreviewRequest(BaseModel):
    file_id: str
    page: int = 1
    highlight_boxes: Optional[list] = None

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "healthy", "service": "FormPilot Backend"}

@app.post("/parse", response_model=ExtractedData)
async def parse_document(
    file: UploadFile = File(...),
    use_cloud: bool = Query(False),
    cloud_provider: Optional[str] = Query(None)
):
    """
    Parse a PDF document and extract fields
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Save uploaded file
        file_path = UPLOAD_DIR / f"{file.filename}"
        content = await file.read()
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Parse PDF
        parser = PDFParser()
        
        if use_cloud and cloud_provider:
            # Use cloud provider if requested
            from extraction.cloud_providers import CloudExtractor
            extractor = CloudExtractor(cloud_provider)
            result = await extractor.extract(file_path)
        else:
            # Use local extraction
            result = await parser.parse(file_path)
        
        # Clean up
        file_path.unlink(missing_ok=True)
        
        return result
        
    except Exception as e:
        logger.error(f"Error parsing document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/preview")
async def preview_page(
    file_id: str,
    page: int = Query(1, ge=1),
    highlight_boxes: Optional[str] = Query(None)
):
    """
    Generate a preview of a PDF page with optional bbox highlights
    """
    try:
        generator = PDFPreviewGenerator()
        
        # Parse highlight boxes if provided
        boxes = []
        if highlight_boxes:
            import json
            boxes = json.loads(highlight_boxes)
        
        # Generate preview
        image_bytes = await generator.generate_preview(
            file_id,
            page - 1,  # Convert to 0-indexed
            highlight_boxes=boxes
        )
        
        return StreamingResponse(
            image_bytes,
            media_type="image/png",
            headers={"Cache-Control": "max-age=3600"}
        )
        
    except Exception as e:
        logger.error(f"Error generating preview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/providers")
async def get_providers():
    """
    Get available cloud providers and their configuration
    """
    providers = {
        "google_docai": {
            "enabled": bool(os.getenv("GOOGLE_DOCAI_KEY")),
            "name": "Google Document AI",
            "estimated_cost_per_page": 0.01
        },
        "aws_textract": {
            "enabled": bool(os.getenv("AWS_ACCESS_KEY_ID")),
            "name": "AWS Textract",
            "estimated_cost_per_page": 0.015
        },
        "azure_document": {
            "enabled": bool(os.getenv("AZURE_FORM_KEY")),
            "name": "Azure Document Intelligence",
            "estimated_cost_per_page": 0.01
        }
    }
    
    return providers

@app.post("/providers/{provider}/estimate")
async def estimate_cost(
    provider: str,
    pages: int = Query(1, ge=1)
):
    """
    Estimate the cost of using a cloud provider
    """
    costs = {
        "google_docai": 0.01,
        "aws_textract": 0.015,
        "azure_document": 0.01
    }
    
    if provider not in costs:
        raise HTTPException(status_code=400, detail="Invalid provider")
    
    total_cost = costs[provider] * pages
    
    return {
        "provider": provider,
        "pages": pages,
        "cost_per_page": costs[provider],
        "total_cost": total_cost,
        "currency": "USD"
    }

@app.get("/fields/canonical")
async def get_canonical_fields():
    """
    Get list of supported canonical field names
    """
    from models import CANONICAL_FIELDS
    return {"fields": CANONICAL_FIELDS}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )