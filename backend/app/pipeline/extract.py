from __future__ import annotations
import re
from typing import Dict, List, Tuple
import fitz  # PyMuPDF

from .validation import validate_field
from .normalize import normalize_key


KeyValue = Tuple[str, str]


def _iter_text_lines(pdf_path: str) -> List[Tuple[int, str]]:
    lines: List[Tuple[int, str]] = []
    with fitz.open(pdf_path) as doc:
        for i, page in enumerate(doc, start=1):
            text = page.get_text("text") or ""
            for line in text.splitlines():
                if line.strip():
                    lines.append((i, line.strip()))
    return lines


def _kv_candidates_from_lines(lines: List[Tuple[int, str]]) -> List[Tuple[int, KeyValue]]:
    results: List[Tuple[int, KeyValue]] = []
    kv_patterns = [
        re.compile(r"^\s*([^:]{2,40})\s*:\s*(.+)$"),
        re.compile(r"^\s*([A-Za-z][\w\s\-/]{1,40})\s+([\w\-/][^:]{1,120})$")
    ]
    for page, line in lines:
        for rx in kv_patterns:
            m = rx.match(line)
            if m:
                key = m.group(1).strip()
                value = m.group(2).strip()
                if len(key) <= 64 and len(value) <= 256:
                    results.append((page, (key, value)))
                break
    return results


def _build_field_record(key: str, value: str, page: int) -> Dict:
    canonical = normalize_key(key)
    validations = [validate_field(canonical, value)]
    candidate = {
        "value": value,
        "confidence": 0.75,
        "bbox": (0.0, 0.0, 0.0, 0.0),
        "sourceText": key,
        "page": page,
    }
    return {
        "canonical": canonical,
        "candidates": [candidate],
        "chosen": candidate,
        "validations": validations,
    }


def extract_fields(pdf_path: str):
    lines = _iter_text_lines(pdf_path)
    scanned = False
    if len(lines) < 3:
        # Heuristic: likely scanned or low text density
        scanned = True
    kv_pairs = _kv_candidates_from_lines(lines)
    fields: Dict[str, Dict] = {}
    for page, (raw_key, value) in kv_pairs:
        record = _build_field_record(raw_key, value, page)
        key = record["canonical"]
        # Keep the highest confidence value per canonical key
        if key not in fields or record["candidates"][0]["confidence"] > fields[key]["candidates"][0]["confidence"]:
            fields[key] = record

    tables: List[List[dict]] = []

    meta = {
        "scanned": scanned,
        "pages": _count_pages(pdf_path),
    }
    return list(fields.values()), tables, meta


def _count_pages(pdf_path: str) -> int:
    with fitz.open(pdf_path) as doc:
        return doc.page_count
