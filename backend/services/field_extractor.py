"""
Field extraction service using NLP and pattern matching
"""

import re
from typing import List, Dict, Tuple, Optional
from ..shared import Field, Candidate, CANONICAL_FIELDS
from ..models import PDFData


class FieldExtractor:
    """Extracts form fields from PDF text using pattern matching and NLP"""
    
    def __init__(self):
        # Field patterns for common form fields
        self.field_patterns = {
            CANONICAL_FIELDS.FIRST_NAME: [
                r'(?:first\s*name|given\s*name|fname)\s*:?\s*([a-zA-Z\s]+)',
                r'([A-Z][a-z]+)(?:\s+[A-Z][a-z]+)*',  # Capitalized words
            ],
            CANONICAL_FIELDS.LAST_NAME: [
                r'(?:last\s*name|surname|family\s*name|lname)\s*:?\s*([a-zA-Z\s]+)',
            ],
            CANONICAL_FIELDS.EMAIL: [
                r'(?:email|e-mail)\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
                r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',  # Standalone email
            ],
            CANONICAL_FIELDS.PHONE: [
                r'(?:phone|telephone|tel|mobile)\s*:?\s*(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})',
                r'(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})',  # Standalone phone
            ],
            CANONICAL_FIELDS.SSN: [
                r'(?:ssn|social\s*security)\s*:?\s*(\d{3}-?\d{2}-?\d{4})',
                r'(\d{3}-?\d{2}-?\d{4})',  # Standalone SSN
            ],
            CANONICAL_FIELDS.DATE_OF_BIRTH: [
                r'(?:date\s*of\s*birth|dob|birth\s*date)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',  # Standalone date
            ],
            CANONICAL_FIELDS.ADDRESS_LINE1: [
                r'(?:address|street)\s*:?\s*(\d+\s+[a-zA-Z0-9\s,.-]+)',
            ],
            CANONICAL_FIELDS.CITY: [
                r'(?:city)\s*:?\s*([a-zA-Z\s]+)',
            ],
            CANONICAL_FIELDS.STATE: [
                r'(?:state|province)\s*:?\s*([a-zA-Z\s]{2,})',
            ],
            CANONICAL_FIELDS.ZIP: [
                r'(?:zip|postal\s*code|zipcode)\s*:?\s*(\d{5}(?:-\d{4})?)',
                r'(\d{5}(?:-\d{4})?)',  # Standalone ZIP
            ],
        }
        
        # Confidence scoring weights
        self.confidence_weights = {
            'explicit_label': 0.9,  # Field has explicit label
            'pattern_match': 0.7,   # Matches known pattern
            'context_clue': 0.5,    # Has context clues
            'standalone': 0.3,      # Standalone value
        }
    
    async def extract_fields(self, pdf_data: PDFData) -> List[Field]:
        """
        Extract form fields from PDF text data
        
        Args:
            pdf_data: Processed PDF data
            
        Returns:
            List of extracted fields
        """
        fields = []
        
        for page_num, text in pdf_data.text_content.items():
            page_fields = await self._extract_fields_from_page(text, page_num)
            fields.extend(page_fields)
        
        # Merge duplicate fields and select best candidates
        merged_fields = self._merge_duplicate_fields(fields)
        
        return merged_fields
    
    async def _extract_fields_from_page(self, text: str, page_num: int) -> List[Field]:
        """Extract fields from a single page of text"""
        fields = []
        
        for canonical_name, patterns in self.field_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                
                for match in matches:
                    value = match.group(1).strip()
                    
                    # Skip empty or very short values
                    if len(value) < 2:
                        continue
                    
                    # Calculate confidence based on match context
                    confidence = self._calculate_confidence(match, text, canonical_name)
                    
                    # Create candidate
                    candidate = Candidate(
                        value=value,
                        confidence=confidence,
                        bbox=[0, 0, 0, 0],  # TODO: Calculate actual bbox
                        sourceText=self._extract_context(text, match.start(), match.end()),
                        page=page_num
                    )
                    
                    # Check if field already exists
                    existing_field = next(
                        (f for f in fields if f.canonical == canonical_name), 
                        None
                    )
                    
                    if existing_field:
                        existing_field.candidates.append(candidate)
                    else:
                        field = Field(
                            canonical=canonical_name,
                            candidates=[candidate],
                            validations=[]
                        )
                        fields.append(field)
        
        return fields
    
    def _calculate_confidence(self, match: re.Match, text: str, canonical_name: str) -> float:
        """Calculate confidence score for a field match"""
        confidence = 0.0
        
        # Check for explicit field labels
        match_start = match.start()
        context_before = text[max(0, match_start - 50):match_start].lower()
        
        if any(label in context_before for label in self._get_field_labels(canonical_name)):
            confidence += self.confidence_weights['explicit_label']
        else:
            confidence += self.confidence_weights['pattern_match']
        
        # Check for context clues
        if ':' in context_before or '=' in context_before:
            confidence += self.confidence_weights['context_clue']
        
        # Normalize to 0-1 range
        return min(confidence, 1.0)
    
    def _get_field_labels(self, canonical_name: str) -> List[str]:
        """Get common labels for a canonical field name"""
        label_map = {
            CANONICAL_FIELDS.FIRST_NAME: ['first name', 'given name', 'fname'],
            CANONICAL_FIELDS.LAST_NAME: ['last name', 'surname', 'family name', 'lname'],
            CANONICAL_FIELDS.EMAIL: ['email', 'e-mail', 'email address'],
            CANONICAL_FIELDS.PHONE: ['phone', 'telephone', 'tel', 'mobile'],
            CANONICAL_FIELDS.SSN: ['ssn', 'social security', 'social security number'],
            CANONICAL_FIELDS.DATE_OF_BIRTH: ['date of birth', 'dob', 'birth date'],
            CANONICAL_FIELDS.ADDRESS_LINE1: ['address', 'street', 'street address'],
            CANONICAL_FIELDS.CITY: ['city'],
            CANONICAL_FIELDS.STATE: ['state', 'province'],
            CANONICAL_FIELDS.ZIP: ['zip', 'postal code', 'zipcode'],
        }
        return label_map.get(canonical_name, [])
    
    def _extract_context(self, text: str, start: int, end: int, context_size: int = 50) -> str:
        """Extract context around a match"""
        context_start = max(0, start - context_size)
        context_end = min(len(text), end + context_size)
        return text[context_start:context_end].strip()
    
    def _merge_duplicate_fields(self, fields: List[Field]) -> List[Field]:
        """Merge fields with the same canonical name, keeping best candidates"""
        field_map = {}
        
        for field in fields:
            if field.canonical in field_map:
                # Merge candidates
                field_map[field.canonical].candidates.extend(field.candidates)
            else:
                field_map[field.canonical] = field
        
        # Sort candidates by confidence and select best ones
        for field in field_map.values():
            field.candidates.sort(key=lambda c: c.confidence, reverse=True)
            # Keep top 3 candidates
            field.candidates = field.candidates[:3]
            
            # Auto-select highest confidence candidate if above threshold
            if field.candidates and field.candidates[0].confidence >= 0.8:
                field.chosen = field.candidates[0]
        
        return list(field_map.values())