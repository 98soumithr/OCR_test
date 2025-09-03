from __future__ import annotations
from typing import Dict, List
from rapidfuzz import process, fuzz

# Lightweight synonym map for canonical names
_CANON_SYNONYMS: Dict[str, List[str]] = {
    "first_name": ["first name", "given name", "fname"],
    "last_name": ["last name", "surname", "lname"],
    "dob": ["date of birth", "birth date"],
    "ssn": ["ssn", "social security"],
    "ein": ["ein", "tax id"],
    "address_line1": ["address line 1", "address1", "street"],
    "address_line2": ["address line 2", "address2", "apt"],
    "zip": ["zip", "postal"],
}


def _label_string(meta: Dict) -> str:
    parts = [
        meta.get("labelText") or "",
        meta.get("placeholder") or "",
        meta.get("ariaLabel") or "",
        meta.get("name") or "",
        meta.get("id") or "",
    ]
    joined = " ".join(p for p in parts if p).lower()
    return " ".join(joined.split())


def _canonical_to_synonyms(canon: str) -> List[str]:
    base = canon.replace("_", " ")
    return [base] + _CANON_SYNONYMS.get(canon, [])


def match_fields_to_inputs(fields: List[Dict], inputs: List[Dict]):
    # Build labels for DOM inputs
    labels = {meta["selector"]: _label_string(meta) for meta in inputs}

    high: List[Dict] = []
    medium: List[Dict] = []
    low: List[Dict] = []

    for field in fields:
        canon = field["canonical"]
        candidates = field.get("candidates", [])
        chosen = field.get("chosen") or (candidates[0] if candidates else None)
        value = (chosen or {}).get("value")
        if not value:
            continue
        search_terms = _canonical_to_synonyms(canon)
        # Score each input label with best term
        best_selector = None
        best_score = 0.0
        for selector, label in labels.items():
            # get best synonym score
            scores = [fuzz.token_set_ratio(term, label) / 100.0 for term in search_terms]
            score = max(scores) if scores else 0.0
            if score > best_score:
                best_score = score
                best_selector = selector
        if not best_selector:
            continue
        item = {
            "selector": best_selector,
            "canonical": canon,
            "value": value,
            "confidence": float(best_score),
            "source": chosen or {},
        }
        if best_score >= 0.92:
            high.append(item)
        elif best_score >= 0.80:
            medium.append(item)
        else:
            low.append(item)

    return {"high": high, "medium": medium, "low": low}
