"""
Field inference service using semantic matching and validation
"""
import asyncio
from typing import List, Dict, Any, Optional, Tuple
import re
from rapidfuzz import fuzz

from app.models.document import Field, Candidate, BoundingBox, Validation
from shared.src.validation import validateFieldValue
from shared.src.constants import FIELD_SYNONYMS, CANONICAL_FIELDS

class FieldInference:
    """Service for inferring canonical field names from extracted text"""
    
    def __init__(self):
        self._initialized = False
    
    async def initialize(self):
        """Initialize semantic matching model"""
        if self._initialized:
            return
        
        # For now, we'll use simple fuzzy matching
        # In production, you'd initialize sentence-transformers here
        self._initialized = True
        print("✅ Field inference initialized")
    
    async def infer_fields(self, raw_fields: List[Dict[str, Any]], confidence_threshold: float = 0.6) -> List[Field]:
        """
        Infer canonical field names from raw extracted fields
        
        Args:
            raw_fields: List of raw field dictionaries with keys, values, bboxes
            confidence_threshold: Minimum confidence to include a field
            
        Returns:
            List of Field objects with canonical names and candidates
        """
        if not self._initialized:
            await self.initialize()
        
        # Group raw fields by canonical name
        canonical_groups: Dict[str, List[Dict[str, Any]]] = {}
        
        for raw_field in raw_fields:
            key = raw_field["key"].lower().strip()
            value = raw_field["value"].strip()
            
            if not value:  # Skip empty values
                continue
            
            # Find best canonical match
            canonical_name, match_confidence = self._find_canonical_match(key, value)
            
            if match_confidence >= confidence_threshold:
                if canonical_name not in canonical_groups:
                    canonical_groups[canonical_name] = []
                
                # Add match confidence to raw field
                raw_field["match_confidence"] = match_confidence
                canonical_groups[canonical_name].append(raw_field)
        
        # Convert to Field objects
        fields = []
        for canonical_name, group in canonical_groups.items():
            candidates = []
            
            for raw_field in group:
                # Create candidate
                candidate = Candidate(
                    value=raw_field["value"],
                    confidence=min(raw_field["confidence"], raw_field["match_confidence"]),
                    bbox=BoundingBox(coordinates=tuple(raw_field["bbox"])),
                    source_text=raw_field.get("source_text"),
                    page=raw_field["page"]
                )
                candidates.append(candidate)
            
            # Sort candidates by confidence
            candidates.sort(key=lambda c: c.confidence, reverse=True)
            
            # Choose best candidate
            chosen = candidates[0] if candidates else None
            
            # Validate chosen candidate
            validations = []
            if chosen:
                validation_results = validateFieldValue(canonical_name, chosen.value)
                validations = [
                    Validation(rule=v["rule"], passed=v["passed"], message=v.get("message"))
                    for v in validation_results
                ]
            
            field = Field(
                canonical=canonical_name,
                candidates=candidates,
                chosen=chosen,
                validations=validations
            )
            
            fields.append(field)
        
        return fields
    
    def _find_canonical_match(self, key: str, value: str) -> Tuple[str, float]:
        """
        Find the best canonical field name match for a key-value pair
        
        Returns:
            Tuple of (canonical_name, confidence)
        """
        best_canonical = None
        best_score = 0.0
        
        # First, try direct pattern matching on the value
        value_canonical, value_score = self._match_by_value_pattern(value)
        if value_score > best_score:
            best_canonical = value_canonical
            best_score = value_score
        
        # Then try fuzzy matching on the key
        for canonical_name, synonyms in FIELD_SYNONYMS.items():
            
            # Check exact match with canonical name
            if key == canonical_name:
                return canonical_name, 1.0
            
            # Check exact match with synonyms
            if key in synonyms:
                return canonical_name, 0.95
            
            # Fuzzy matching with synonyms
            for synonym in synonyms + [canonical_name]:
                fuzzy_score = fuzz.ratio(key.lower(), synonym.lower()) / 100.0
                if fuzzy_score > best_score:
                    best_canonical = canonical_name
                    best_score = fuzzy_score
        
        return best_canonical or "unknown", best_score
    
    def _match_by_value_pattern(self, value: str) -> Tuple[Optional[str], float]:
        """Match canonical field by value patterns"""
        
        # Email pattern
        if re.match(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$', value):
            return CANONICAL_FIELDS.EMAIL, 0.95
        
        # Phone pattern
        if re.match(r'^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$', value.replace(' ', '')):
            return CANONICAL_FIELDS.PHONE, 0.9
        
        # SSN pattern
        if re.match(r'^\d{3}[-.\s]?\d{2}[-.\s]?\d{4}$', value):
            return CANONICAL_FIELDS.SSN, 0.95
        
        # EIN pattern
        if re.match(r'^\d{2}[-.\s]?\d{7}$', value):
            return CANONICAL_FIELDS.EIN, 0.95
        
        # ZIP code pattern
        if re.match(r'^\d{5}(?:-\d{4})?$', value):
            return CANONICAL_FIELDS.ZIP_CODE, 0.9
        
        # Date patterns
        date_patterns = [
            r'^\d{1,2}[/\-]\d{1,2}[/\-]\d{4}$',  # MM/DD/YYYY or MM-DD-YYYY
            r'^\d{4}[/\-]\d{1,2}[/\-]\d{1,2}$',  # YYYY/MM/DD or YYYY-MM-DD
            r'^\d{1,2}/\d{1,2}/\d{2}$',          # MM/DD/YY
        ]
        for pattern in date_patterns:
            if re.match(pattern, value):
                return CANONICAL_FIELDS.DATE_OF_BIRTH, 0.8  # Could be DOB or other date
        
        return None, 0.0