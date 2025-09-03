"""
PDF parsing and extraction pipeline
"""

import logging
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import re

import fitz  # PyMuPDF
import numpy as np
from paddleocr import PaddleOCR
from unstructured.partition.pdf import partition_pdf
from unstructured.documents.elements import Element

from models import (
    ExtractedData, ExtractedField, Candidate, TableData,
    DocumentMeta, ExtractionMethod, ValidationResult
)
from .validators import FieldValidator
from .field_inference import FieldInferencer

logger = logging.getLogger(__name__)

class PDFParser:
    """Main PDF parsing and extraction class"""
    
    def __init__(self):
        self.ocr = None
        self.validator = FieldValidator()
        self.inferencer = FieldInferencer()
        
    def _init_ocr(self):
        """Lazy load OCR engine"""
        if self.ocr is None:
            self.ocr = PaddleOCR(
                use_angle_cls=True,
                lang='en',
                show_log=False
            )
    
    async def parse(self, file_path: Path) -> ExtractedData:
        """
        Main parsing pipeline
        """
        start_time = time.time()
        
        # Open PDF
        doc = fitz.open(str(file_path))
        num_pages = len(doc)
        
        # Try text extraction first
        text_data, has_text = self._extract_text_layer(doc)
        
        if has_text and self._check_text_density(text_data):
            # Use text extraction
            method = ExtractionMethod.TEXT
            extracted_data = self._process_text_data(text_data)
        else:
            # Use OCR
            method = ExtractionMethod.OCR
            self._init_ocr()
            extracted_data = await self._process_with_ocr(doc)
        
        # Extract tables
        tables = self._extract_tables(doc)
        
        # Infer canonical field names
        fields = self._infer_fields(extracted_data)
        
        # Validate fields
        for field in fields:
            field.validations = self.validator.validate_field(
                field.canonical,
                field.chosen.value if field.chosen else field.candidates[0].value
            )
        
        # Close document
        doc.close()
        
        processing_time = time.time() - start_time
        
        return ExtractedData(
            fields=fields,
            tables=tables,
            meta=DocumentMeta(
                scanned=(method == ExtractionMethod.OCR),
                pages=num_pages,
                extraction_method=method,
                processing_time=processing_time,
                file_size=file_path.stat().st_size
            )
        )
    
    def _extract_text_layer(self, doc: fitz.Document) -> Tuple[List[Dict], bool]:
        """Extract text from PDF text layer"""
        text_data = []
        has_text = False
        
        for page_num, page in enumerate(doc):
            page_text = page.get_text("dict")
            
            if page_text.get("blocks"):
                has_text = True
                
                for block in page_text["blocks"]:
                    if block.get("type") == 0:  # Text block
                        for line in block.get("lines", []):
                            for span in line.get("spans", []):
                                text = span.get("text", "").strip()
                                if text:
                                    bbox = span.get("bbox", [0, 0, 0, 0])
                                    text_data.append({
                                        "text": text,
                                        "bbox": bbox,
                                        "page": page_num,
                                        "confidence": 1.0  # Text layer has high confidence
                                    })
        
        return text_data, has_text
    
    def _check_text_density(self, text_data: List[Dict]) -> bool:
        """Check if text density is sufficient"""
        if not text_data:
            return False
        
        total_chars = sum(len(item["text"]) for item in text_data)
        return total_chars > 100  # Minimum character threshold
    
    async def _process_with_ocr(self, doc: fitz.Document) -> List[Dict]:
        """Process PDF with OCR"""
        extracted_data = []
        
        for page_num, page in enumerate(doc):
            # Convert page to image
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x scale for better OCR
            img_data = pix.tobytes("png")
            
            # Run OCR
            import io
            from PIL import Image
            img = Image.open(io.BytesIO(img_data))
            img_array = np.array(img)
            
            result = self.ocr.ocr(img_array, cls=True)
            
            if result and result[0]:
                for line in result[0]:
                    box = line[0]
                    text = line[1][0]
                    confidence = line[1][1]
                    
                    # Convert box coordinates
                    x_min = min(p[0] for p in box)
                    y_min = min(p[1] for p in box)
                    x_max = max(p[0] for p in box)
                    y_max = max(p[1] for p in box)
                    
                    extracted_data.append({
                        "text": text,
                        "bbox": [x_min, y_min, x_max - x_min, y_max - y_min],
                        "page": page_num,
                        "confidence": confidence
                    })
        
        return extracted_data
    
    def _process_text_data(self, text_data: List[Dict]) -> List[Dict]:
        """Process extracted text data to find key-value pairs"""
        processed = []
        
        # Sort by page and vertical position
        text_data.sort(key=lambda x: (x["page"], x["bbox"][1]))
        
        # Look for key-value patterns
        kv_pattern = re.compile(r'^([^:]+):\s*(.+)$')
        
        i = 0
        while i < len(text_data):
            text = text_data[i]["text"]
            
            # Check for key-value pattern
            match = kv_pattern.match(text)
            if match:
                key, value = match.groups()
                processed.append({
                    "key": key.strip(),
                    "value": value.strip(),
                    "bbox": text_data[i]["bbox"],
                    "page": text_data[i]["page"],
                    "confidence": text_data[i]["confidence"]
                })
            else:
                # Check if this might be a label followed by value
                if i + 1 < len(text_data):
                    next_text = text_data[i + 1]["text"]
                    # Check if they're on same line (similar y-coordinate)
                    if abs(text_data[i]["bbox"][1] - text_data[i + 1]["bbox"][1]) < 10:
                        processed.append({
                            "key": text,
                            "value": next_text,
                            "bbox": text_data[i]["bbox"],
                            "page": text_data[i]["page"],
                            "confidence": min(text_data[i]["confidence"], 
                                            text_data[i + 1]["confidence"])
                        })
                        i += 1  # Skip next item
                    else:
                        # Standalone text
                        processed.append({
                            "key": "",
                            "value": text,
                            "bbox": text_data[i]["bbox"],
                            "page": text_data[i]["page"],
                            "confidence": text_data[i]["confidence"]
                        })
                else:
                    # Standalone text
                    processed.append({
                        "key": "",
                        "value": text,
                        "bbox": text_data[i]["bbox"],
                        "page": text_data[i]["page"],
                        "confidence": text_data[i]["confidence"]
                    })
            
            i += 1
        
        return processed
    
    def _extract_tables(self, doc: fitz.Document) -> List[TableData]:
        """Extract tables from PDF"""
        tables = []
        
        try:
            # Use unstructured for table extraction
            elements = partition_pdf(
                file=doc.name,
                strategy="hi_res",
                infer_table_structure=True
            )
            
            for element in elements:
                if element.category == "Table":
                    # Parse table content
                    table_text = element.text
                    lines = table_text.strip().split('\n')
                    
                    if len(lines) > 1:
                        headers = lines[0].split('\t')
                        rows = [line.split('\t') for line in lines[1:]]
                        
                        tables.append(TableData(
                            headers=headers,
                            rows=rows,
                            confidence=0.8,  # Default confidence
                            page=0,  # Would need to extract from metadata
                            bbox=(0, 0, 0, 0)  # Would need to extract from metadata
                        ))
        except Exception as e:
            logger.warning(f"Table extraction failed: {e}")
        
        return tables
    
    def _infer_fields(self, extracted_data: List[Dict]) -> List[ExtractedField]:
        """Infer canonical field names from extracted data"""
        fields = []
        
        for item in extracted_data:
            key = item.get("key", "")
            value = item.get("value", "")
            
            if not value:
                continue
            
            # Infer canonical name
            canonical = self.inferencer.infer_canonical_name(key, value)
            
            if canonical:
                # Check if we already have this field
                existing = next((f for f in fields if f.canonical == canonical), None)
                
                candidate = Candidate(
                    value=value,
                    confidence=item["confidence"],
                    bbox=tuple(item["bbox"]),
                    source_text=f"{key}: {value}" if key else value,
                    page=item["page"]
                )
                
                if existing:
                    existing.candidates.append(candidate)
                    # Update chosen if this has higher confidence
                    if not existing.chosen or candidate.confidence > existing.chosen.confidence:
                        existing.chosen = candidate
                else:
                    fields.append(ExtractedField(
                        canonical=canonical,
                        candidates=[candidate],
                        chosen=candidate,
                        validations=[]
                    ))
        
        return fields