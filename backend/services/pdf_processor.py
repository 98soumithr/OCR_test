"""
PDF processing service using PyMuPDF and OCR
"""

import fitz  # PyMuPDF
import io
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
from PIL import Image

from ..models import PDFData


class PDFProcessor:
    """Handles PDF text extraction and OCR processing"""
    
    def __init__(self):
        self.ocr_available = self._check_ocr_availability()
    
    def _check_ocr_availability(self) -> bool:
        """Check if OCR libraries are available"""
        try:
            from paddleocr import PaddleOCR
            return True
        except ImportError:
            return False
    
    async def process_pdf(self, file_path: Path) -> PDFData:
        """
        Process PDF file and extract text/images
        
        Args:
            file_path: Path to PDF file
            
        Returns:
            PDFData with extracted content
        """
        doc = fitz.open(file_path)
        page_count = len(doc)
        
        text_content = {}
        images = {}
        scanned = False
        ocr_provider = None
        processing_errors = []
        
        for page_num in range(page_count):
            page = doc[page_num]
            
            # Extract text from PDF layer
            text = page.get_text()
            text_content[page_num + 1] = text
            
            # Check if page is scanned (low text density)
            if len(text.strip()) < 50:  # Threshold for scanned pages
                scanned = True
                
                # Convert page to image for OCR
                try:
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better OCR
                    img_data = pix.tobytes("png")
                    
                    # Perform OCR if available
                    if self.ocr_available:
                        ocr_text = await self._perform_ocr(img_data)
                        if ocr_text:
                            text_content[page_num + 1] = ocr_text
                            ocr_provider = "paddleocr"
                    else:
                        processing_errors.append(f"OCR not available for page {page_num + 1}")
                        
                except Exception as e:
                    processing_errors.append(f"OCR failed for page {page_num + 1}: {str(e)}")
            
            # Store page image for preview
            try:
                pix = page.get_pixmap(matrix=fitz.Matrix(1, 1))
                img_data = pix.tobytes("png")
                images[page_num + 1] = img_data
            except Exception as e:
                processing_errors.append(f"Image extraction failed for page {page_num + 1}: {str(e)}")
        
        doc.close()
        
        return PDFData(
            page_count=page_count,
            scanned=scanned,
            text_content=text_content,
            images=images,
            ocr_provider=ocr_provider,
            processing_errors=processing_errors
        )
    
    async def _perform_ocr(self, image_data: bytes) -> Optional[str]:
        """Perform OCR on image data using PaddleOCR"""
        try:
            from paddleocr import PaddleOCR
            
            # Initialize OCR (use_angle_cls=True for better text detection)
            ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
            
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to numpy array
            img_array = np.array(image)
            
            # Perform OCR
            result = ocr.ocr(img_array, cls=True)
            
            # Extract text from results
            text_parts = []
            if result and result[0]:
                for line in result[0]:
                    if line and len(line) >= 2:
                        text_parts.append(line[1][0])  # Extract text from [bbox, (text, confidence)]
            
            return ' '.join(text_parts) if text_parts else None
            
        except Exception as e:
            print(f"OCR processing failed: {e}")
            return None
    
    def get_page_image(self, file_path: Path, page_num: int, zoom: float = 1.0) -> Optional[bytes]:
        """
        Get page image as PNG bytes
        
        Args:
            file_path: Path to PDF file
            page_num: Page number (1-indexed)
            zoom: Zoom factor for image quality
            
        Returns:
            PNG image bytes or None if failed
        """
        try:
            doc = fitz.open(file_path)
            if page_num > len(doc):
                return None
                
            page = doc[page_num - 1]  # Convert to 0-indexed
            matrix = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=matrix)
            img_data = pix.tobytes("png")
            doc.close()
            
            return img_data
            
        except Exception as e:
            print(f"Failed to get page image: {e}")
            return None