"""
Core field extraction service with text extraction, OCR, and field inference
"""
import re
import time
from typing import List, Dict, Optional, Tuple, Any
import fitz  # PyMuPDF
import numpy as np
from PIL import Image
import io

from app.models.document import (
    ParseResult, ParseOptions, Field, Candidate, Table, DocumentMeta, 
    BoundingBox, ProcessingProvider, Validation
)
from app.services.ocr_service import OCRService
from app.services.field_inference import FieldInference
from app.services.pdf_processor import PDFProcessor

class FieldExtractor:
    """Main service for extracting fields from PDF documents"""
    
    def __init__(self):
        self.ocr_service = None
        self.field_inference = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize ML models and services"""
        if self._initialized:
            return
        
        print("🔧 Initializing field extractor...")
        
        # Initialize OCR service
        self.ocr_service = OCRService()
        await self.ocr_service.initialize()
        
        # Initialize field inference
        self.field_inference = FieldInference()
        await self.field_inference.initialize()
        
        self._initialized = True
        print("✅ Field extractor initialized")
    
    async def extract_fields(self, pdf_bytes: bytes, options: ParseOptions) -> ParseResult:
        """
        Extract fields from a PDF document
        
        Args:
            pdf_bytes: PDF file content
            options: Processing options
            
        Returns:
            ParseResult with extracted fields and metadata
        """
        if not self._initialized:
            await self.initialize()
        
        start_time = time.time()
        
        # Step 1: Try text layer extraction
        text_extraction = PDFProcessor.extract_text_layer(pdf_bytes)
        
        # Step 2: Determine if OCR is needed
        needs_ocr = PDFProcessor.is_scanned_document(pdf_bytes) and options.enable_ocr
        
        if needs_ocr and self.ocr_service.is_available():
            print("📄 Document appears to be scanned, using OCR...")
            ocr_result = await self.ocr_service.extract_text(pdf_bytes)
            extraction_data = ocr_result
        else:
            print("📝 Using text layer extraction...")
            extraction_data = text_extraction
        
        # Step 3: Detect key-value pairs and fields
        raw_fields = self._detect_key_value_pairs(extraction_data)
        
        # Step 4: Infer canonical field names
        fields = await self.field_inference.infer_fields(raw_fields, options.confidence_threshold)
        
        # Step 5: Extract tables (basic implementation)
        tables = self._extract_tables(extraction_data)
        
        # Step 6: Create metadata
        meta = DocumentMeta(
            is_scanned=needs_ocr,
            total_pages=extraction_data['total_pages'],
            processing_time=time.time() - start_time,
            provider=options.provider
        )
        
        return ParseResult(
            fields=fields,
            tables=tables,
            meta=meta
        )
    
    def _detect_key_value_pairs(self, extraction_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect key-value pairs from extracted text"""
        raw_fields = []
        
        for page_data in extraction_data["pages"]:
            page_num = page_data["page"]
            
            # Process text blocks to find key-value patterns
            blocks = page_data.get("blocks", [])
            
            # Method 1: Adjacent text blocks (key followed by value)
            for i, block in enumerate(blocks):
                text = block["text"].strip()
                
                # Skip very short or very long text
                if len(text) < 2 or len(text) > 100:
                    continue
                
                # Look for patterns that suggest this is a label/key
                if self._looks_like_field_label(text):
                    # Look for value in next few blocks
                    for j in range(i + 1, min(i + 4, len(blocks))):
                        value_block = blocks[j]
                        value_text = value_block["text"].strip()
                        
                        if self._looks_like_field_value(value_text):
                            raw_fields.append({
                                "key": text.rstrip(':').strip(),
                                "value": value_text,
                                "bbox": value_block["bbox"],
                                "page": page_num,
                                "confidence": min(block.get("confidence", 0.8), value_block.get("confidence", 0.8)),
                                "source_text": f"{text} {value_text}"
                            })
                            break
            
            # Method 2: Inline key-value patterns
            page_text = page_data["text"]
            self._detect_inline_patterns(page_text, page_num, raw_fields)
            
            # Method 3: Standalone values (emails, phones, SSNs)
            self._detect_standalone_values(page_text, page_num, raw_fields)
        
        return raw_fields
    
    def _looks_like_field_label(self, text: str) -> bool:
        """Check if text looks like a field label"""
        # Common field label patterns
        label_patterns = [
            r'.*name.*:?$',
            r'.*address.*:?$',
            r'.*phone.*:?$',
            r'.*email.*:?$',
            r'.*date.*:?$',
            r'.*ssn.*:?$',
            r'.*social.*:?$',
            r'.*employer.*:?$',
            r'.*signature.*:?$',
            r'^[A-Za-z\s]{3,30}:?$'  # Generic pattern
        ]
        
        text_lower = text.lower()
        return any(re.match(pattern, text_lower) for pattern in label_patterns)
    
    def _looks_like_field_value(self, text: str) -> bool:
        """Check if text looks like a field value"""
        # Skip if it looks like another label
        if text.endswith(':') or self._looks_like_field_label(text):
            return False
        
        # Skip very short or very long text
        if len(text) < 1 or len(text) > 100:
            return False
        
        # Skip common non-value text
        skip_patterns = [
            r'^page\s+\d+',
            r'^form\s+',
            r'^section\s+',
            r'^please\s+',
            r'^instructions?:?'
        ]
        
        text_lower = text.lower()
        if any(re.match(pattern, text_lower) for pattern in skip_patterns):
            return False
        
        return True
    
    def _detect_inline_patterns(self, text: str, page_num: int, raw_fields: List[Dict[str, Any]]):
        """Detect inline key-value patterns in text"""
        
        # Pattern 1: "Key: Value" on same line
        kvp_patterns = [
            r'([A-Za-z\s]{2,30}):\s*([^\n\r:]{1,50})',
            r'([A-Za-z\s]{2,30})\s*[-_]\s*([^\n\r\-_]{1,50})',
            r'([A-Za-z\s]{2,30})\s*[=]\s*([^\n\r=]{1,50})'
        ]
        
        for pattern in kvp_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
            
            for match in matches:
                key = match.group(1).strip()
                value = match.group(2).strip()
                
                # Validate key and value
                if (self._looks_like_field_label(key) and 
                    self._looks_like_field_value(value) and
                    not self._is_duplicate_field(raw_fields, key, value)):
                    
                    # Estimate bounding box position
                    bbox = self._estimate_text_bbox(text, match.start(), match.end())
                    
                    raw_fields.append({
                        "key": key,
                        "value": value,
                        "bbox": bbox,
                        "page": page_num,
                        "confidence": 0.8,
                        "source_text": match.group(0)
                    })
    
    def _detect_standalone_values(self, text: str, page_num: int, raw_fields: List[Dict[str, Any]]):
        """Detect standalone values like phone numbers, emails, SSNs"""
        
        patterns = {
            "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            "phone": r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b',
            "ssn": r'\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b',
            "ein": r'\b\d{2}[-.\s]?\d{7}\b',
            "zip_code": r'\b\d{5}(?:-\d{4})?\b',
            "date": r'\b\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b'
        }
        
        for field_type, pattern in patterns.items():
            for match in re.finditer(pattern, text):
                value = match.group().strip()
                
                # Skip if already found
                if self._is_duplicate_field(raw_fields, field_type, value):
                    continue
                
                bbox = self._estimate_text_bbox(text, match.start(), match.end())
                confidence = 0.95 if field_type in ["email", "ssn"] else 0.85
                
                raw_fields.append({
                    "key": field_type,
                    "value": value,
                    "bbox": bbox,
                    "page": page_num,
                    "confidence": confidence,
                    "source_text": value
                })
    
    def _is_duplicate_field(self, raw_fields: List[Dict[str, Any]], key: str, value: str) -> bool:
        """Check if this field already exists"""
        return any(
            field["key"].lower() == key.lower() and field["value"] == value
            for field in raw_fields
        )
    
    def _estimate_text_bbox(self, full_text: str, start_pos: int, end_pos: int) -> List[float]:
        """Estimate bounding box for text at given position (simplified)"""
        # This is a simplified estimation
        # In a real implementation, you'd track character positions from the PDF
        
        lines_before = full_text[:start_pos].count('\n')
        char_in_line = start_pos - full_text.rfind('\n', 0, start_pos) - 1
        
        # Estimate position (assuming 12pt font, 72 DPI)
        char_width = 7  # Average character width
        line_height = 16
        
        x1 = 72 + char_in_line * char_width  # 1 inch margin
        y1 = 72 + lines_before * line_height
        x2 = x1 + (end_pos - start_pos) * char_width
        y2 = y1 + line_height
        
        return [x1, y1, x2, y2]
    
    def _extract_tables(self, extraction_data: Dict[str, Any]) -> List[Table]:
        """Extract tables from the document (basic implementation)"""
        tables = []
        
        for page_data in extraction_data["pages"]:
            page_num = page_data["page"]
            text = page_data["text"]
            
            # Look for table-like structures
            lines = text.split('\n')
            potential_table_lines = []
            
            for line in lines:
                # Clean and split line
                cleaned_line = re.sub(r'\s+', ' ', line.strip())
                
                # Look for lines with multiple values separated by significant whitespace or tabs
                parts = re.split(r'\s{3,}|\t+', cleaned_line)
                
                if len(parts) >= 3:  # At least 3 columns
                    # Filter out empty parts
                    parts = [part.strip() for part in parts if part.strip()]
                    if len(parts) >= 3:
                        potential_table_lines.append(parts)
            
            # If we found potential table rows, try to create a table
            if len(potential_table_lines) >= 2:
                # Use first row as headers
                headers = potential_table_lines[0]
                max_cols = len(headers)
                
                # Process data rows
                cells = []
                for row_idx, row_parts in enumerate(potential_table_lines[1:]):
                    cell_row = []
                    for col_idx, cell_value in enumerate(row_parts[:max_cols]):
                        cell_row.append({
                            "value": cell_value,
                            "confidence": 0.7,
                            "bbox": BoundingBox(coordinates=(
                                100 + col_idx * 120,  # Estimated x position
                                200 + row_idx * 25,   # Estimated y position
                                220 + col_idx * 120,  # Estimated width
                                225 + row_idx * 25    # Estimated height
                            )),
                            "row_index": row_idx,
                            "col_index": col_idx
                        })
                    
                    if cell_row:
                        cells.append(cell_row)
                
                if cells:
                    tables.append(Table(
                        headers=headers,
                        cells=cells,
                        bbox=BoundingBox(coordinates=(
                            100, 200, 
                            100 + max_cols * 120, 
                            200 + len(cells) * 25
                        )),
                        page=page_num
                    ))
        
        return tables