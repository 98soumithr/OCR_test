"""
PDF parsing endpoint
"""
import time
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from fastapi.responses import JSONResponse

from app.models.document import ParseResult, ParseOptions, ProcessingProvider
from app.services.field_extractor import FieldExtractor
from app.services.document_store import DocumentStore

router = APIRouter(tags=["parsing"])

def get_field_extractor(request: Request) -> FieldExtractor:
    """Dependency to get field extractor from app state"""
    return request.app.state.field_extractor

def get_document_store(request: Request) -> DocumentStore:
    """Dependency to get document store from app state"""
    return request.app.state.document_store

@router.post("/parse", response_model=ParseResult)
async def parse_document(
    file: UploadFile = File(...),
    provider: Optional[str] = None,
    enable_ocr: Optional[bool] = True,
    confidence_threshold: Optional[float] = 0.6,
    field_extractor: FieldExtractor = Depends(get_field_extractor),
    document_store: DocumentStore = Depends(get_document_store)
):
    """
    Parse a PDF document and extract form fields
    
    Args:
        file: PDF file to process
        provider: Processing provider (local, docai, textract, azure)
        enable_ocr: Whether to enable OCR for scanned documents
        confidence_threshold: Minimum confidence threshold for field extraction
        
    Returns:
        ParseResult with extracted fields, tables, and metadata
    """
    start_time = time.time()
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Read file content
    try:
        pdf_bytes = await file.read()
        if len(pdf_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
            
        # Check file size (50MB limit)
        max_size = 50 * 1024 * 1024  # 50MB
        if len(pdf_bytes) > max_size:
            raise HTTPException(status_code=413, detail="File too large (max 50MB)")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    # Store document
    document_id = document_store.store_document(pdf_bytes, file.filename)
    
    # Create parse options
    try:
        provider_enum = ProcessingProvider(provider) if provider else ProcessingProvider.LOCAL
    except ValueError:
        provider_enum = ProcessingProvider.LOCAL
    
    options = ParseOptions(
        enable_ocr=enable_ocr,
        confidence_threshold=confidence_threshold,
        provider=provider_enum
    )
    
    # Process document
    try:
        result = await field_extractor.extract_fields(pdf_bytes, options)
        
        # Add processing metadata
        result.meta.processing_time = time.time() - start_time
        result.meta.file_name = file.filename
        result.meta.file_size = len(pdf_bytes)
        
        # Store result
        document_store.store_result(document_id, result)
        
        return result
        
    except Exception as e:
        # Clean up document on error
        document_store.delete_document(document_id)
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@router.get("/documents")
async def list_documents(document_store: DocumentStore = Depends(get_document_store)):
    """List all stored documents"""
    return {"documents": document_store.list_documents()}

@router.get("/documents/{document_id}")
async def get_document_result(
    document_id: str,
    document_store: DocumentStore = Depends(get_document_store)
):
    """Get parsing result for a specific document"""
    result = document_store.get_result(document_id)
    if not result:
        raise HTTPException(status_code=404, detail="Document not found or not processed")
    return result

@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    document_store: DocumentStore = Depends(get_document_store)
):
    """Delete a document and its results"""
    deleted = document_store.delete_document(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}