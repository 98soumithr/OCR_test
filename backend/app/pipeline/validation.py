from __future__ import annotations
import re
from typing import Dict


_VALIDATORS = {
    "ssn": re.compile(r"^(?!000|666|9\d\d)\d{3}[- ]?(?!00)\d{2}[- ]?(?!0000)\d{4}$"),
    "ein": re.compile(r"^[1-9]\d-?\d{7}$"),
    "dob": re.compile(r"^(0[1-9]|1[0-2])[\-/](0[1-9]|[12]\d|3[01])[\-/](19|20)\d{2}$"),
    "zip": re.compile(r"^\d{5}(-\d{4})?$"),
    "email": re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$"),
    "phone": re.compile(r"^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$"),
}


_DEF_MESSAGES = {
    "ssn": "Must be valid US SSN",
    "ein": "Must be valid EIN",
    "dob": "Must be MM/DD/YYYY",
    "zip": "Must be US ZIP",
    "email": "Must be valid email",
    "phone": "Must be US phone",
}


def validate_field(canonical: str, value: str) -> Dict:
    for key, rx in _VALIDATORS.items():
        if key == canonical:
            ok = bool(rx.match(value.strip()))
            return {"rule": key, "passed": ok, "message": None if ok else _DEF_MESSAGES.get(key)}
    # default pass-through when no validator applies
    return {"rule": "none", "passed": True}
