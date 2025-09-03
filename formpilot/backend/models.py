"""
Pydantic models for FormPilot backend
"""

from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field, validator
from enum import Enum

# Canonical field names
CANONICAL_FIELDS = [
    'first_name',
    'middle_name',
    'last_name',
    'full_name',
    'dob',
    'ssn',
    'ein',
    'email',
    'phone',
    'address_line1',
    'address_line2',
    'city',
    'state',
    'zip',
    'country',
    'employer',
    'occupation',
    'income',
    'marital_status',
    'gender',
    'citizenship',
    'passport_number',
    'drivers_license',
    'account_number',
    'routing_number',
    'policy_number',
    'member_id',
    'group_number',
    'effective_date',
    'expiration_date',
    'signature',
    'date_signed'
]

class ExtractionMethod(str, Enum):
    TEXT = "text"
    OCR = "ocr"
    CLOUD = "cloud"

class ValidationResult(BaseModel):
    rule: str
    passed: bool
    message: Optional[str] = None

class Candidate(BaseModel):
    value: str
    confidence: float = Field(ge=0, le=1)
    bbox: Tuple[float, float, float, float]  # x, y, width, height
    source_text: Optional[str] = None
    page: int = Field(ge=0)

class ExtractedField(BaseModel):
    canonical: str
    candidates: List[Candidate]
    chosen: Optional[Candidate] = None
    validations: List[ValidationResult] = []
    
    @validator('canonical')
    def validate_canonical(cls, v):
        if v not in CANONICAL_FIELDS:
            # Allow custom fields but log warning
            import logging
            logging.warning(f"Non-canonical field name: {v}")
        return v

class TableData(BaseModel):
    headers: List[str]
    rows: List[List[str]]
    confidence: float = Field(ge=0, le=1)
    page: int = Field(ge=0)
    bbox: Tuple[float, float, float, float]

class DocumentMeta(BaseModel):
    scanned: bool
    pages: int = Field(ge=1)
    extraction_method: ExtractionMethod
    processing_time: Optional[float] = None
    file_size: Optional[int] = None
    
class ExtractedData(BaseModel):
    fields: List[ExtractedField]
    tables: List[TableData] = []
    meta: DocumentMeta

class CloudProviderConfig(BaseModel):
    enabled: bool
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    estimated_cost: Optional[float] = None

class ProcessingOptions(BaseModel):
    use_cloud: bool = False
    cloud_provider: Optional[str] = None
    ocr_languages: List[str] = ["en"]
    confidence_threshold: float = 0.5
    extract_tables: bool = True
    extract_checkboxes: bool = True