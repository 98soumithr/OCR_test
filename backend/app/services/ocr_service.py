"""
OCR service with fallback implementation when PaddleOCR is not available
"""
import asyncio
import io
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF
import numpy as np
from PIL import Image

class OCRService:
    """OCR service for extracting text from scanned PDFs"""
    
    def __init__(self):
        self.ocr_engine = None
        self._initialized = False
        self._use_fallback = False
    
    async def initialize(self):
        """Initialize OCR engine"""
        if self._initialized:
            return
        
        try:
            # Try to import and initialize PaddleOCR
            from paddleocr import PaddleOCR
            
            def init_ocr():
                return PaddleOCR(
                    use_angle_cls=True,
                    lang='en',
                    show_log=False,
                    use_gpu=False
                )
            
            loop = asyncio.get_event_loop()
            self.ocr_engine = await loop.run_in_executor(None, init_ocr)
            
            self._initialized = True
            print("✅ PaddleOCR initialized")
            
        except ImportError:
            print("⚠️  PaddleOCR not available, using fallback OCR")
            self._use_fallback = True
            self._initialized = True
        except Exception as e:
            print(f"⚠️  PaddleOCR initialization failed: {e}, using fallback")
            self._use_fallback = True
            self._initialized = True
    
    async def extract_text(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Extract text from PDF using OCR
        """
        if not self._initialized:
            await self.initialize()
        
        if self._use_fallback:
            return self._fallback_ocr(pdf_bytes)
        
        return await self._paddleocr_extract(pdf_bytes)
    
    async def _paddleocr_extract(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Extract text using PaddleOCR"""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages_data = []
        
        try:
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Convert page to image
                mat = fitz.Matrix(2.0, 2.0)  # 2x scale for better OCR
                pix = page.get_pixmap(matrix=mat)
                img_data = pix.tobytes("png")
                
                # Convert to numpy array for OCR
                img = Image.open(io.BytesIO(img_data))
                img_array = np.array(img)
                
                # Run OCR
                loop = asyncio.get_event_loop()
                ocr_result = await loop.run_in_executor(None, self.ocr_engine.ocr, img_array)
                
                # Process OCR results
                text_blocks = []
                page_text = ""
                
                if ocr_result and ocr_result[0]:
                    for line in ocr_result[0]:
                        if len(line) >= 2:
                            bbox_points = line[0]
                            text_info = line[1]
                            text = text_info[0] if isinstance(text_info, tuple) else str(text_info)
                            confidence = text_info[1] if isinstance(text_info, tuple) and len(text_info) > 1 else 0.9
                            
                            # Convert 4-point bbox to [x1, y1, x2, y2]
                            x_coords = [point[0] for point in bbox_points]
                            y_coords = [point[1] for point in bbox_points]
                            bbox = [
                                min(x_coords) / 2.0,  # Scale back from 2x
                                min(y_coords) / 2.0,
                                max(x_coords) / 2.0,
                                max(y_coords) / 2.0
                            ]
                            
                            text_blocks.append({
                                "text": text,
                                "bbox": bbox,
                                "confidence": confidence
                            })
                            page_text += text + " "
                
                pages_data.append({
                    "page": page_num + 1,
                    "text": page_text.strip(),
                    "blocks": text_blocks,
                    "dimensions": {
                        "width": page.rect.width,
                        "height": page.rect.height
                    }
                })
        
        finally:
            doc.close()
        
        return {
            "pages": pages_data,
            "total_pages": len(pages_data),
            "total_text_length": sum(len(p["text"]) for p in pages_data),
            "extraction_method": "paddleocr"
        }
    
    def _fallback_ocr(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Fallback OCR implementation using PyMuPDF's built-in capabilities
        This is less accurate but doesn't require additional dependencies
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages_data = []
        
        try:
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Try to get any available text
                text_dict = page.get_text("dict")
                page_text = ""
                text_blocks = []
                
                # Extract what text we can
                for block in text_dict["blocks"]:
                    if "lines" in block:
                        for line in block["lines"]:
                            for span in line["spans"]:
                                text = span["text"].strip()
                                if text:
                                    text_blocks.append({
                                        "text": text,
                                        "bbox": list(span["bbox"]),
                                        "confidence": 0.6  # Lower confidence for fallback
                                    })
                                    page_text += text + " "
                
                # If still no text, create placeholder
                if not page_text.strip():
                    page_text = f"[Scanned page {page_num + 1} - OCR not available]"
                    text_blocks = [{
                        "text": page_text,
                        "bbox": [0, 0, page.rect.width, page.rect.height],
                        "confidence": 0.1
                    }]
                
                pages_data.append({
                    "page": page_num + 1,
                    "text": page_text.strip(),
                    "blocks": text_blocks,
                    "dimensions": {
                        "width": page.rect.width,
                        "height": page.rect.height
                    }
                })
        
        finally:
            doc.close()
        
        return {
            "pages": pages_data,
            "total_pages": len(pages_data),
            "total_text_length": sum(len(p["text"]) for p in pages_data),
            "extraction_method": "fallback_ocr"
        }
    
    def is_available(self) -> bool:
        """Check if OCR service is available"""
        return self._initialized