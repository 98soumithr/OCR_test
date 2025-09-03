"""
Semantic matching using sentence embeddings
"""

import logging
from typing import List, Dict, Tuple, Optional
from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer
from rapidfuzz import fuzz

logger = logging.getLogger(__name__)

class EmbeddingMatcher:
    """Match field labels using semantic embeddings"""
    
    _instance = None
    _model = None
    
    @classmethod
    def initialize(cls):
        """Initialize the singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
            cls._model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Embedding model loaded successfully")
    
    @classmethod
    def get_instance(cls):
        """Get the singleton instance"""
        if cls._instance is None:
            cls.initialize()
        return cls._instance
    
    def __init__(self):
        if EmbeddingMatcher._instance is not None:
            raise Exception("Use EmbeddingMatcher.get_instance()")
    
    @lru_cache(maxsize=1000)
    def _get_embedding(self, text: str) -> np.ndarray:
        """Get embedding for text (cached)"""
        return self._model.encode(text, convert_to_numpy=True)
    
    def match_fields(
        self,
        dom_labels: List[str],
        canonical_fields: List[str],
        extracted_values: Dict[str, str],
        threshold_high: float = 0.92,
        threshold_medium: float = 0.80
    ) -> List[Dict]:
        """
        Match DOM field labels to canonical field names
        
        Args:
            dom_labels: List of labels from DOM elements
            canonical_fields: List of canonical field names
            extracted_values: Dictionary of canonical field -> extracted value
            threshold_high: Threshold for automatic filling
            threshold_medium: Threshold for review/confirmation
        
        Returns:
            List of matches with scores and confidence levels
        """
        matches = []
        
        # Get embeddings for all labels and fields
        label_embeddings = [self._get_embedding(label.lower()) for label in dom_labels]
        
        # Build expanded field names with synonyms
        field_expansions = self._expand_field_names(canonical_fields)
        
        for i, label in enumerate(dom_labels):
            label_embedding = label_embeddings[i]
            best_match = None
            best_score = 0
            best_field = None
            
            for canonical in canonical_fields:
                # Get all variations of this field name
                variations = field_expansions[canonical]
                
                for variation in variations:
                    # Compute cosine similarity
                    variation_embedding = self._get_embedding(variation.lower())
                    score = self._cosine_similarity(label_embedding, variation_embedding)
                    
                    if score > best_score:
                        best_score = score
                        best_field = canonical
                        best_match = variation
            
            # Also try fuzzy string matching as fallback
            fuzzy_score = 0
            if best_field:
                fuzzy_score = fuzz.token_sort_ratio(label.lower(), best_match.lower()) / 100
                
                # Combine scores (weighted average)
                combined_score = (best_score * 0.7) + (fuzzy_score * 0.3)
            else:
                combined_score = best_score
            
            # Determine confidence level
            if combined_score >= threshold_high:
                confidence = 'high'
                should_fill = True
            elif combined_score >= threshold_medium:
                confidence = 'medium'
                should_fill = False  # Requires review
            else:
                confidence = 'low'
                should_fill = False
            
            if best_field and combined_score >= threshold_medium:
                matches.append({
                    'dom_label': label,
                    'dom_index': i,
                    'canonical_field': best_field,
                    'matched_variation': best_match,
                    'semantic_score': float(best_score),
                    'fuzzy_score': float(fuzzy_score),
                    'combined_score': float(combined_score),
                    'confidence': confidence,
                    'should_fill': should_fill,
                    'value': extracted_values.get(best_field, '')
                })
        
        return matches
    
    def _expand_field_names(self, canonical_fields: List[str]) -> Dict[str, List[str]]:
        """
        Expand canonical field names with synonyms and variations
        """
        expansions = {}
        
        # Predefined synonyms
        synonyms = {
            'first_name': ['first name', 'first', 'fname', 'given name', 'forename'],
            'last_name': ['last name', 'last', 'lname', 'surname', 'family name'],
            'middle_name': ['middle name', 'middle', 'mname', 'middle initial', 'mi'],
            'full_name': ['full name', 'name', 'complete name', 'legal name'],
            'dob': ['date of birth', 'birth date', 'birthday', 'dob', 'born'],
            'ssn': ['social security number', 'social security', 'ssn', 'social'],
            'ein': ['employer identification number', 'ein', 'tax id', 'federal tax id'],
            'email': ['email', 'e-mail', 'email address', 'electronic mail'],
            'phone': ['phone', 'telephone', 'tel', 'mobile', 'cell', 'contact number'],
            'address_line1': ['address', 'street address', 'address line 1', 'street'],
            'address_line2': ['address line 2', 'apt', 'apartment', 'suite', 'unit'],
            'city': ['city', 'town', 'municipality', 'locality'],
            'state': ['state', 'province', 'region'],
            'zip': ['zip code', 'zip', 'postal code', 'postcode'],
            'country': ['country', 'nation'],
            'employer': ['employer', 'company', 'organization', 'workplace'],
            'occupation': ['occupation', 'job title', 'profession', 'position'],
            'income': ['income', 'salary', 'wages', 'annual income', 'earnings'],
            'marital_status': ['marital status', 'married', 'single', 'relationship status'],
            'gender': ['gender', 'sex', 'male/female'],
            'citizenship': ['citizenship', 'nationality', 'citizen status'],
            'passport_number': ['passport number', 'passport', 'passport no'],
            'drivers_license': ['driver license', 'drivers license', 'dl', 'license number'],
            'account_number': ['account number', 'account', 'acct number'],
            'routing_number': ['routing number', 'routing', 'aba', 'transit number'],
            'policy_number': ['policy number', 'policy', 'policy no'],
            'member_id': ['member id', 'member number', 'membership', 'subscriber id'],
            'group_number': ['group number', 'group', 'group no'],
            'effective_date': ['effective date', 'start date', 'begin date'],
            'expiration_date': ['expiration date', 'expire date', 'end date', 'valid until'],
            'signature': ['signature', 'sign here', 'authorized signature'],
            'date_signed': ['date signed', 'signature date', 'signed on']
        }
        
        for field in canonical_fields:
            if field in synonyms:
                expansions[field] = synonyms[field]
            else:
                # Generate variations from the field name itself
                variations = [field]
                
                # Replace underscores with spaces
                variations.append(field.replace('_', ' '))
                
                # Title case version
                variations.append(field.replace('_', ' ').title())
                
                expansions[field] = variations
        
        return expansions
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
    
    def find_best_selector(
        self,
        field_name: str,
        selectors: List[Dict],
        previous_mappings: Optional[Dict] = None
    ) -> Optional[str]:
        """
        Find the best selector for a field from a list of DOM selectors
        
        Args:
            field_name: Canonical field name
            selectors: List of selector dictionaries with labels
            previous_mappings: Previous successful mappings for this site
        
        Returns:
            Best matching selector or None
        """
        if not selectors:
            return None
        
        # Check if we have a previous mapping
        if previous_mappings and field_name in previous_mappings:
            prev_selector = previous_mappings[field_name]
            # Check if this selector still exists
            if any(s['selector'] == prev_selector for s in selectors):
                return prev_selector
        
        # Find best match using embeddings
        labels = [s.get('label', '') for s in selectors]
        matches = self.match_fields(
            labels,
            [field_name],
            {field_name: ''},
            threshold_medium=0.70  # Lower threshold for selector matching
        )
        
        if matches:
            best_match = max(matches, key=lambda x: x['combined_score'])
            return selectors[best_match['dom_index']]['selector']
        
        return None