"""
PDF preview generation with bbox highlighting
"""

import io
import logging
from pathlib import Path
from typing import List, Optional, Tuple

import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

class PDFPreviewGenerator:
    """Generate PDF page previews with bbox highlighting"""
    
    def __init__(self):
        self.cache_dir = Path("./cache/previews")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    async def generate_preview(
        self,
        file_path: str,
        page_num: int = 0,
        highlight_boxes: Optional[List[Tuple[float, float, float, float]]] = None,
        scale: float = 2.0
    ) -> io.BytesIO:
        """
        Generate a preview image of a PDF page with optional bbox highlights
        
        Args:
            file_path: Path to PDF file
            page_num: Page number (0-indexed)
            highlight_boxes: List of bounding boxes to highlight [(x, y, width, height), ...]
            scale: Scale factor for image quality
        
        Returns:
            BytesIO object containing PNG image
        """
        try:
            # Open PDF
            doc = fitz.open(file_path)
            
            if page_num >= len(doc):
                raise ValueError(f"Page {page_num} does not exist (document has {len(doc)} pages)")
            
            page = doc[page_num]
            
            # Render page to image
            mat = fitz.Matrix(scale, scale)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_data = pix.tobytes("png")
            
            # Convert to PIL Image
            img = Image.open(io.BytesIO(img_data))
            
            # Draw highlight boxes if provided
            if highlight_boxes:
                img = self._draw_highlights(img, highlight_boxes, scale)
            
            # Save to BytesIO
            output = io.BytesIO()
            img.save(output, format='PNG', optimize=True)
            output.seek(0)
            
            # Close document
            doc.close()
            
            return output
            
        except Exception as e:
            logger.error(f"Error generating preview: {e}")
            raise
    
    def _draw_highlights(
        self,
        img: Image.Image,
        boxes: List[Tuple[float, float, float, float]],
        scale: float
    ) -> Image.Image:
        """
        Draw highlight boxes on image
        
        Args:
            img: PIL Image
            boxes: List of bounding boxes [(x, y, width, height), ...]
            scale: Scale factor used for rendering
        
        Returns:
            Modified PIL Image
        """
        draw = ImageDraw.Draw(img, 'RGBA')
        
        # Define colors for different confidence levels
        colors = {
            'high': (0, 255, 0, 80),      # Green with transparency
            'medium': (255, 165, 0, 80),  # Orange with transparency
            'low': (255, 0, 0, 80)         # Red with transparency
        }
        
        for box in boxes:
            if isinstance(box, dict):
                # Box with metadata
                coords = box.get('coords', [0, 0, 0, 0])
                confidence = box.get('confidence', 0.5)
                label = box.get('label', '')
            else:
                # Simple box coordinates
                coords = box
                confidence = 0.5
                label = ''
            
            x, y, width, height = coords
            
            # Scale coordinates
            x *= scale
            y *= scale
            width *= scale
            height *= scale
            
            # Determine color based on confidence
            if confidence >= 0.9:
                color = colors['high']
            elif confidence >= 0.7:
                color = colors['medium']
            else:
                color = colors['low']
            
            # Draw rectangle
            draw.rectangle(
                [(x, y), (x + width, y + height)],
                outline=color[:3] + (255,),  # Full opacity for outline
                fill=color,  # Transparent fill
                width=2
            )
            
            # Draw label if provided
            if label:
                try:
                    # Try to use a better font if available
                    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
                except:
                    font = ImageFont.load_default()
                
                # Draw label background
                text_bbox = draw.textbbox((x, y - 20), label, font=font)
                draw.rectangle(
                    text_bbox,
                    fill=(255, 255, 255, 200)
                )
                
                # Draw label text
                draw.text(
                    (x, y - 20),
                    label,
                    fill=(0, 0, 0),
                    font=font
                )
        
        return img
    
    async def generate_thumbnail(
        self,
        file_path: str,
        page_num: int = 0,
        size: Tuple[int, int] = (200, 200)
    ) -> io.BytesIO:
        """
        Generate a thumbnail of a PDF page
        
        Args:
            file_path: Path to PDF file
            page_num: Page number (0-indexed)
            size: Thumbnail size (width, height)
        
        Returns:
            BytesIO object containing PNG thumbnail
        """
        # Generate full preview first
        preview = await self.generate_preview(file_path, page_num, scale=1.0)
        
        # Create thumbnail
        img = Image.open(preview)
        img.thumbnail(size, Image.Resampling.LANCZOS)
        
        # Save to BytesIO
        output = io.BytesIO()
        img.save(output, format='PNG', optimize=True)
        output.seek(0)
        
        return output