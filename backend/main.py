"""
FormPilot Backend - FastAPI service for PDF processing and form field extraction
"""

import os
import time
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .models import ParseResponse, ProcessingMeta
from .services.pdf_processor import PDFProcessor
from .services.field_extractor import FieldExtractor
from .services.validator import FieldValidator
from .services.cloud_providers import CloudProviderManager

# Initialize FastAPI app
app = FastAPI(
    title="FormPilot API",
    description="PDF form field extraction and processing service",
    version="1.0.0"
)

# CORS middleware for extension communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*", "http://localhost:*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
pdf_processor = PDFProcessor()
field_extractor = FieldExtractor()
validator = FieldValidator()
cloud_manager = CloudProviderManager()

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Serve static files for previews
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "FormPilot API is running", "version": "1.0.0"}


@app.post("/parse", response_model=ParseResponse)
async def parse_pdf(
    file: UploadFile = File(...),
    use_cloud: bool = Query(False, description="Use cloud providers for processing"),
    cloud_provider: Optional[str] = Query(None, description="Specific cloud provider to use")
):
    """
    Extract form fields from uploaded PDF
    
    Args:
        file: PDF file to process
        use_cloud: Whether to use cloud providers
        cloud_provider: Specific cloud provider (google, aws, azure)
    
    Returns:
        ParseResponse with extracted fields, tables, and metadata
    """
    start_time = time.time()
    
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File must be a PDF")
        
        # Save uploaded file
        file_path = UPLOAD_DIR / f"{int(time.time())}_{file.filename}"
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Process PDF
        if use_cloud and cloud_provider:
            # Use cloud provider
            result = await cloud_manager.process_pdf(file_path, cloud_provider)
        else:
            # Use local processing
            result = await process_pdf_locally(file_path)
        
        # Add processing time
        result.meta.processingTime = int((time.time() - start_time) * 1000)
        
        # Clean up uploaded file
        file_path.unlink(missing_ok=True)
        
        return result
        
    except Exception as e:
        # Clean up on error
        if 'file_path' in locals():
            file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


async def process_pdf_locally(file_path: Path) -> ParseResponse:
    """Process PDF using local services"""
    # Extract text and images from PDF
    pdf_data = await pdf_processor.process_pdf(file_path)
    
    # Extract fields from text
    fields = await field_extractor.extract_fields(pdf_data)
    
    # Validate extracted fields
    for field in fields:
        field.validations = await validator.validate_field(field)
    
    # Create metadata
    meta = ProcessingMeta(
        scanned=pdf_data.scanned,
        pages=pdf_data.page_count,
        processingTime=0,  # Will be set by caller
        ocrProvider=pdf_data.ocr_provider
    )
    
    return ParseResponse(
        fields=fields,
        tables=[],  # TODO: Implement table extraction
        meta=meta
    )


@app.get("/preview/{page}")
async def get_preview(
    page: int,
    file_id: str = Query(..., description="File identifier"),
    highlight_fields: Optional[List[str]] = Query(None, description="Fields to highlight")
):
    """
    Get PDF page preview with optional field highlighting
    
    Args:
        page: Page number (1-indexed)
        file_id: File identifier
        highlight_fields: List of field names to highlight
    
    Returns:
        PNG image of the page with highlighted fields
    """
    try:
        # TODO: Implement preview generation with bbox overlays
        # For now, return a placeholder
        return JSONResponse(
            status_code=501,
            content={"message": "Preview endpoint not yet implemented"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")


@app.get("/providers")
async def get_providers():
    """Get list of available cloud providers and their status"""
    return await cloud_manager.get_providers_status()


@app.get("/providers/{provider}/cost")
async def estimate_cost(
    provider: str,
    pages: int = Query(..., description="Number of pages"),
    use_ocr: bool = Query(False, description="Whether OCR will be needed")
):
    """Estimate cost for cloud provider processing"""
    try:
        cost = await cloud_manager.estimate_cost(provider, pages, use_ocr)
        return {"provider": provider, "estimated_cost": cost}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)