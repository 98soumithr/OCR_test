"""
PDF processing utilities for text extraction and page rendering
"""
import io
from typing import Dict, Any, List, Tuple, Optional
import fitz  # PyMuPDF
import numpy as np
from PIL import Image, ImageDraw

class PDFProcessor:
    """Handles PDF text extraction and rendering"""
    
    @staticmethod
    def extract_text_layer(pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Extract text from PDF text layer with bounding boxes
        
        Args:
            pdf_bytes: PDF file content
            
        Returns:
            Dictionary with extracted text and metadata
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        pages_data = []
        total_text_length = 0
        
        try:
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Get text blocks with detailed information
                blocks = page.get_text("dict")
                page_text = ""
                text_blocks = []
                
                for block in blocks["blocks"]:
                    if "lines" in block:  # Text block
                        for line in block["lines"]:
                            line_text = ""
                            line_bbox = None
                            
                            for span in line["spans"]:
                                text = span["text"].strip()
                                if text:
                                    # Update line bounding box
                                    span_bbox = span["bbox"]
                                    if line_bbox is None:
                                        line_bbox = list(span_bbox)
                                    else:
                                        line_bbox[0] = min(line_bbox[0], span_bbox[0])  # min x
                                        line_bbox[1] = min(line_bbox[1], span_bbox[1])  # min y
                                        line_bbox[2] = max(line_bbox[2], span_bbox[2])  # max x
                                        line_bbox[3] = max(line_bbox[3], span_bbox[3])  # max y
                                    
                                    line_text += text + " "
                            
                            if line_text.strip() and line_bbox:
                                text_blocks.append({
                                    "text": line_text.strip(),
                                    "bbox": line_bbox,
                                    "confidence": 1.0,  # Text layer has perfect confidence
                                    "font_size": line["spans"][0]["size"] if line["spans"] else 12,
                                    "font_flags": line["spans"][0]["flags"] if line["spans"] else 0
                                })
                                page_text += line_text
                
                pages_data.append({
                    "page": page_num + 1,
                    "text": page_text.strip(),
                    "blocks": text_blocks,
                    "dimensions": {
                        "width": page.rect.width,
                        "height": page.rect.height
                    }
                })
                
                total_text_length += len(page_text)
        
        finally:
            doc.close()
        
        return {
            "pages": pages_data,
            "total_pages": len(pages_data),
            "total_text_length": total_text_length,
            "extraction_method": "text_layer"
        }
    
    @staticmethod
    def render_page_with_overlays(
        pdf_bytes: bytes, 
        page_num: int, 
        bboxes: List[Tuple[float, float, float, float]] = None,
        scale: float = 2.0,
        bbox_color: str = "#FF0000",
        bbox_opacity: float = 0.3
    ) -> bytes:
        """
        Render a PDF page as PNG with optional bounding box overlays
        
        Args:
            pdf_bytes: PDF file content
            page_num: Page number (1-indexed)
            bboxes: List of bounding boxes to highlight
            scale: Rendering scale factor
            bbox_color: Color for bounding boxes
            bbox_opacity: Opacity for bounding boxes
            
        Returns:
            PNG image bytes
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        try:
            if page_num > len(doc) or page_num < 1:
                raise ValueError(f"Invalid page number {page_num}. Document has {len(doc)} pages")
            
            # Get page (0-indexed in PyMuPDF)
            page = doc[page_num - 1]
            
            # Render page to image
            mat = fitz.Matrix(scale, scale)
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            
            # If no overlays needed, return as-is
            if not bboxes:
                return img_data
            
            # Convert to PIL Image for drawing overlays
            img = Image.open(io.BytesIO(img_data)).convert('RGBA')
            
            # Parse color
            if bbox_color.startswith('#'):
                bbox_color = bbox_color[1:]
            try:
                r = int(bbox_color[0:2], 16)
                g = int(bbox_color[2:4], 16)
                b = int(bbox_color[4:6], 16)
                color = (r, g, b, int(255 * bbox_opacity))
                outline_color = (r, g, b, 255)
            except:
                color = (255, 0, 0, int(255 * bbox_opacity))
                outline_color = (255, 0, 0, 255)
            
            # Create overlay
            overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)
            
            # Draw bounding boxes
            for bbox in bboxes:
                x1, y1, x2, y2 = [coord * scale for coord in bbox]
                
                # Draw filled rectangle
                draw.rectangle([x1, y1, x2, y2], fill=color, outline=outline_color, width=2)
            
            # Composite overlay onto image
            img = Image.alpha_composite(img, overlay)
            
            # Convert back to PNG bytes
            output = io.BytesIO()
            img.convert('RGB').save(output, format='PNG', optimize=True)
            return output.getvalue()
            
        finally:
            doc.close()
    
    @staticmethod
    def get_page_info(pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Get basic information about a PDF document
        
        Args:
            pdf_bytes: PDF file content
            
        Returns:
            Dictionary with page count and dimensions
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        try:
            page_count = len(doc)
            
            # Get dimensions from first page
            first_page = doc[0] if page_count > 0 else None
            dimensions = None
            if first_page:
                rect = first_page.rect
                dimensions = {
                    "width": rect.width,
                    "height": rect.height
                }
            
            return {
                "page_count": page_count,
                "dimensions": dimensions
            }
            
        finally:
            doc.close()
    
    @staticmethod
    def is_scanned_document(pdf_bytes: bytes, text_threshold: int = 100) -> bool:
        """
        Determine if a PDF is likely scanned based on text density
        
        Args:
            pdf_bytes: PDF file content
            text_threshold: Minimum characters per page to consider non-scanned
            
        Returns:
            True if document appears to be scanned
        """
        try:
            text_data = PDFProcessor.extract_text_layer(pdf_bytes)
            total_text = text_data["total_text_length"]
            total_pages = text_data["total_pages"]
            
            avg_text_per_page = total_text / total_pages if total_pages > 0 else 0
            return avg_text_per_page < text_threshold
            
        except Exception:
            # If we can't extract text, assume it's scanned
            return True