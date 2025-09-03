from __future__ import annotations
import io
import json
import os
import uuid
from typing import List, Optional, Tuple

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field as PydanticField

# Avoid importing heavy libs at module import time. Lazy import in endpoints.

FILES_DIR = os.environ.get("FORMPILOT_FILES_DIR", "/workspace/fixtures/parsed")
os.makedirs(FILES_DIR, exist_ok=True)

app = FastAPI(title="FormPilot Backend", version="0.1.0")

# For development, allow all origins (extension talks to localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CandidateModel(BaseModel):
    value: str
    confidence: float
    bbox: Tuple[float, float, float, float]
    sourceText: Optional[str] = None
    page: int


class ValidationModel(BaseModel):
    rule: str
    passed: bool
    message: Optional[str] = None


class FieldModel(BaseModel):
    canonical: str
    candidates: List[CandidateModel]
    chosen: Optional[CandidateModel] = None
    validations: List[ValidationModel]


class ParsedResponseModel(BaseModel):
    fields: List[FieldModel]
    tables: List[List[dict]]
    meta: dict


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/parse", response_model=ParsedResponseModel)
async def parse(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")
    suffix = ".pdf"
    if not file.filename.lower().endswith(".pdf"):
        # We allow non-pdf for dev but still store as .pdf
        suffix = os.path.splitext(file.filename)[1] or ".bin"
    file_id = str(uuid.uuid4())
    stored_path = os.path.join(FILES_DIR, f"{file_id}{suffix}")
    content = await file.read()
    with open(stored_path, "wb") as f:
        f.write(content)

    # Lazy import to avoid importing heavy dependencies unless needed
    from .pipeline.extract import extract_fields  # type: ignore
    fields, tables, meta = extract_fields(stored_path)
    meta.update({"file_id": file_id})
    return {"fields": fields, "tables": tables, "meta": meta}


@app.get("/preview")
async def preview(
    file_id: str = Query(..., description="ID returned by /parse"),
    page: int = Query(1, ge=1),
    boxes: Optional[str] = Query(None, description="JSON-encoded list of bbox with page numbers: [{'page':1,'bbox':[x0,y0,x1,y1]}]")
):
    # Find stored file by ID (assume .pdf else first match)
    candidates = [
        os.path.join(FILES_DIR, name)
        for name in os.listdir(FILES_DIR)
        if name.startswith(file_id)
    ]
    if not candidates:
        raise HTTPException(status_code=404, detail="file_id not found")
    path = candidates[0]

    overlay_boxes: List[Tuple[float, float, float, float]] = []
    if boxes:
        try:
            raw = json.loads(boxes)
            overlay_boxes = [tuple(obj["bbox"]) for obj in raw if int(obj.get("page", 0)) == int(page)]  # type: ignore
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid boxes: {exc}")

    from .pipeline.preview import render_page_with_boxes  # type: ignore
    png_bytes = render_page_with_boxes(path, page=page, boxes=overlay_boxes)
    return Response(content=png_bytes, media_type="image/png")


@app.get("/providers/docai")
async def provider_docai_info():
    if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        raise HTTPException(status_code=400, detail="Google Document AI not configured")
    return JSONResponse({"status": "ok", "note": "stub"})


@app.get("/providers/textract")
async def provider_textract_info():
    if not os.environ.get("AWS_ACCESS_KEY_ID"):
        raise HTTPException(status_code=400, detail="AWS Textract not configured")
    return JSONResponse({"status": "ok", "note": "stub"})


@app.get("/providers/azure")
async def provider_azure_info():
    if not os.environ.get("AZURE_FORM_RECOGNIZER_KEY"):
        raise HTTPException(status_code=400, detail="Azure Document Intelligence not configured")
    return JSONResponse({"status": "ok", "note": "stub"})
