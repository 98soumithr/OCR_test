from __future__ import annotations
import re

_CANON_MAP = {
    r"^first\s*name$": "first_name",
    r"^last\s*name$": "last_name",
    r"^middle\s*name$": "middle_name",
    r"^dob|date\s*of\s*birth$": "dob",
    r"^ssn|social\s*security$": "ssn",
    r"^ein$": "ein",
    r"^email$": "email",
    r"^phone|telephone$": "phone",
    r"^address\s*line\s*1|address1$": "address_line1",
    r"^address\s*line\s*2|address2$": "address_line2",
    r"^city$": "city",
    r"^state$": "state",
    r"^zip|postal$": "zip",
}


def normalize_key(key: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9\s]", " ", key).lower().strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    for pattern, canon in _CANON_MAP.items():
        if re.search(pattern, cleaned):
            return canon
    return cleaned.replace(" ", "_")[:64]
