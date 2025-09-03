"""
Pydantic models for FormPilot backend
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from ..shared import (
    Field, Candidate, Validation, Table, ProcessingMeta, ParseResponse,
    BoundingBoxSchema, CandidateSchema, ValidationSchema, FieldSchema,
    TableSchema, ProcessingMetaSchema, ParseResponseSchema
)


class PDFData(BaseModel):
    """Raw PDF processing data"""
    page_count: int
    scanned: bool
    text_content: Dict[int, str]  # page_num -> text
    images: Dict[int, Any]  # page_num -> image data
    ocr_provider: Optional[str] = None
    processing_errors: List[str] = Field(default_factory=list)


class CloudProviderConfig(BaseModel):
    """Configuration for cloud providers"""
    name: str
    enabled: bool
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    region: Optional[str] = None


class ProcessingOptions(BaseModel):
    """Options for PDF processing"""
    use_ocr: bool = True
    ocr_language: str = "en"
    confidence_threshold: float = 0.5
    extract_tables: bool = True
    validate_fields: bool = True


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None