from __future__ import annotations
from typing import Iterable, Tuple
import fitz  # PyMuPDF


def render_page_with_boxes(
    pdf_path: str,
    page: int,
    boxes: Iterable[Tuple[float, float, float, float]],
) -> bytes:
    with fitz.open(pdf_path) as doc:
        page_index = max(0, min(page - 1, doc.page_count - 1))
        pg = doc.load_page(page_index)

        # Draw overlays using PyMuPDF to keep coordinates consistent
        for box in boxes:
            rect = fitz.Rect(*box)
            pg.draw_rect(rect, color=(1, 0, 0), width=2)

        # Render and return PNG bytes
        pixmap = pg.get_pixmap(dpi=144)
        return pixmap.tobytes("png")
