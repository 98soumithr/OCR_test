"""
PDF preview endpoint with field highlighting
"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import Response
import fitz  # PyMuPDF
from PIL import Image, ImageDraw
import io

from app.services.document_store import DocumentStore

router = APIRouter(tags=["preview"])

def get_document_store(request: Request) -> DocumentStore:
    """Dependency to get document store from app state"""
    return request.app.state.document_store

@router.get("/preview/{document_id}/{page}")
async def get_preview(
    document_id: str,
    page: int,
    highlight_fields: Optional[str] = Query(None, description="Comma-separated canonical field names to highlight"),
    bbox_color: str = Query("#FF0000", description="Hex color for bounding boxes"),
    bbox_opacity: float = Query(0.3, ge=0, le=1, description="Opacity for bounding boxes"),
    scale: float = Query(2.0, ge=0.5, le=4.0, description="Rendering scale factor"),
    document_store: DocumentStore = Depends(get_document_store)
):
    """
    Generate a PNG preview of a PDF page with optional field highlighting
    
    Args:
        document_id: ID of the stored document
        page: Page number (1-indexed)
        highlight_fields: Comma-separated list of canonical field names to highlight
        bbox_color: Hex color for bounding boxes
        bbox_opacity: Opacity for bounding boxes (0-1)
        scale: Rendering scale factor for image quality
        
    Returns:
        PNG image with optional field highlighting
    """
    # Get document
    pdf_bytes = document_store.get_document(document_id)
    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get parsing result for field highlighting
    result = document_store.get_result(document_id)
    highlight_field_list = []
    if highlight_fields:
        highlight_field_list = [f.strip() for f in highlight_fields.split(',')]
    
    try:
        # Open PDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        if page > len(doc) or page < 1:
            doc.close()
            raise HTTPException(status_code=400, detail=f"Invalid page number. Document has {len(doc)} pages")
        
        # Get page (0-indexed in PyMuPDF)
        pdf_page = doc[page - 1]
        
        # Render page to image
        mat = fitz.Matrix(scale, scale)  # Scale factor for better quality
        pix = pdf_page.get_pixmap(matrix=mat)
        img_data = pix.tobytes("png")
        
        # Convert to PIL Image for drawing overlays
        img = Image.open(io.BytesIO(img_data))
        
        # Add field highlighting if requested and result available
        if result and highlight_field_list:
            draw = ImageDraw.Draw(img)
            
            # Parse color
            if bbox_color.startswith('#'):
                bbox_color = bbox_color[1:]
            try:
                r = int(bbox_color[0:2], 16)
                g = int(bbox_color[2:4], 16)
                b = int(bbox_color[4:6], 16)
                color = (r, g, b, int(255 * bbox_opacity))
            except:
                color = (255, 0, 0, int(255 * bbox_opacity))
            
            # Draw bounding boxes for highlighted fields
            for field in result.fields:
                if field.canonical in highlight_field_list:
                    for candidate in field.candidates:
                        if candidate.page == page:
                            # Scale bbox coordinates to match rendered image
                            bbox = candidate.bbox.coordinates
                            x1, y1, x2, y2 = [coord * scale for coord in bbox]
                            
                            # Draw rectangle
                            draw.rectangle([x1, y1, x2, y2], outline=color[:3], width=2)
                            
                            # Draw semi-transparent fill
                            overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
                            overlay_draw = ImageDraw.Draw(overlay)
                            overlay_draw.rectangle([x1, y1, x2, y2], fill=color)
                            img = Image.alpha_composite(img.convert('RGBA'), overlay)
        
        # Convert back to PNG bytes
        output = io.BytesIO()
        img.convert('RGB').save(output, format='PNG', optimize=True)
        output.seek(0)
        
        doc.close()
        
        return Response(
            content=output.getvalue(),
            media_type="image/png",
            headers={
                "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
                "Content-Disposition": f"inline; filename=\"{document_id}_page_{page}.png\""
            }
        )
        
    except Exception as e:
        if 'doc' in locals():
            doc.close()
        raise HTTPException(status_code=500, detail=f"Error generating preview: {str(e)}")

@router.get("/preview/{document_id}/info")
async def get_preview_info(
    document_id: str,
    document_store: DocumentStore = Depends(get_document_store)
):
    """Get preview information for a document"""
    pdf_bytes = document_store.get_document(document_id)
    if not pdf_bytes:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(doc)
        
        # Get page dimensions for the first page
        first_page = doc[0]
        rect = first_page.rect
        
        doc.close()
        
        return {
            "document_id": document_id,
            "page_count": page_count,
            "page_dimensions": {
                "width": rect.width,
                "height": rect.height
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading document: {str(e)}")