"""
Field inference and canonical name mapping
"""

import re
from typing import Optional, Dict, List
from rapidfuzz import fuzz, process

from models import CANONICAL_FIELDS

class FieldInferencer:
    """Infer canonical field names from extracted text"""
    
    def __init__(self):
        self.field_patterns = self._build_patterns()
        self.field_synonyms = self._build_synonyms()
    
    def _build_patterns(self) -> Dict[str, re.Pattern]:
        """Build regex patterns for common fields"""
        return {
            'ssn': re.compile(r'^\d{3}-?\d{2}-?\d{4}$'),
            'ein': re.compile(r'^\d{2}-?\d{7}$'),
            'phone': re.compile(r'^[\d\s\-\(\)]+$'),
            'email': re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
            'zip': re.compile(r'^\d{5}(-\d{4})?$'),
            'dob': re.compile(r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$'),
        }
    
    def _build_synonyms(self) -> Dict[str, List[str]]:
        """Build synonym mappings for field names"""
        return {
            'first_name': ['first', 'fname', 'given name', 'forename', 'prenom'],
            'last_name': ['last', 'lname', 'surname', 'family name', 'nom'],
            'middle_name': ['middle', 'mname', 'middle initial', 'mi'],
            'full_name': ['name', 'full name', 'complete name', 'legal name'],
            'dob': ['date of birth', 'birth date', 'birthday', 'born', 'dob'],
            'ssn': ['social security', 'social security number', 'ssn', 'social'],
            'ein': ['ein', 'employer identification', 'tax id', 'federal tax'],
            'email': ['email', 'e-mail', 'email address', 'electronic mail'],
            'phone': ['phone', 'telephone', 'tel', 'mobile', 'cell', 'contact'],
            'address_line1': ['address', 'street', 'address 1', 'street address'],
            'address_line2': ['address 2', 'apt', 'apartment', 'suite', 'unit'],
            'city': ['city', 'town', 'municipality', 'locality'],
            'state': ['state', 'province', 'region', 'st'],
            'zip': ['zip', 'zip code', 'postal code', 'postcode', 'postal'],
            'country': ['country', 'nation', 'pays'],
            'employer': ['employer', 'company', 'organization', 'work'],
            'occupation': ['occupation', 'job', 'profession', 'position', 'title'],
            'income': ['income', 'salary', 'wages', 'earnings', 'compensation'],
            'marital_status': ['marital', 'marital status', 'married', 'single'],
            'gender': ['gender', 'sex', 'male/female', 'm/f'],
            'citizenship': ['citizenship', 'nationality', 'citizen'],
            'passport_number': ['passport', 'passport number', 'passport no'],
            'drivers_license': ['driver license', 'drivers license', 'dl', 'license'],
            'account_number': ['account', 'account number', 'acct'],
            'routing_number': ['routing', 'routing number', 'aba', 'transit'],
            'policy_number': ['policy', 'policy number', 'policy no'],
            'member_id': ['member', 'member id', 'membership', 'subscriber'],
            'group_number': ['group', 'group number', 'group no'],
            'effective_date': ['effective', 'effective date', 'start date', 'begin'],
            'expiration_date': ['expiration', 'expire', 'end date', 'valid until'],
            'signature': ['signature', 'sign', 'signed by', 'authorized'],
            'date_signed': ['date signed', 'signature date', 'signed on']
        }
    
    def infer_canonical_name(self, key: str, value: str) -> Optional[str]:
        """
        Infer canonical field name from key and value
        """
        # Clean key
        key_clean = key.lower().strip()
        
        # First try pattern matching on value
        for field_name, pattern in self.field_patterns.items():
            if pattern.match(value):
                # Validate further based on field type
                if field_name == 'ssn' and self._validate_ssn(value):
                    return 'ssn'
                elif field_name == 'ein' and self._validate_ein(value):
                    return 'ein'
                elif field_name == 'email':
                    return 'email'
                elif field_name == 'phone' and len(re.sub(r'\D', '', value)) >= 10:
                    return 'phone'
                elif field_name == 'zip':
                    return 'zip'
                elif field_name == 'dob':
                    return 'dob'
        
        # Try synonym matching on key
        if key_clean:
            best_match = None
            best_score = 0
            
            for canonical, synonyms in self.field_synonyms.items():
                # Check exact match first
                if key_clean in synonyms:
                    return canonical
                
                # Fuzzy match
                match = process.extractOne(
                    key_clean,
                    synonyms,
                    scorer=fuzz.token_sort_ratio
                )
                
                if match and match[1] > best_score:
                    best_match = canonical
                    best_score = match[1]
            
            if best_score >= 80:  # Threshold for fuzzy matching
                return best_match
        
        # Try to infer from value characteristics
        return self._infer_from_value(value)
    
    def _infer_from_value(self, value: str) -> Optional[str]:
        """Infer field type from value characteristics"""
        value_clean = value.strip()
        
        # Check for name-like values
        if re.match(r'^[A-Za-z\s\-\']+$', value_clean):
            words = value_clean.split()
            if len(words) == 1 and len(value_clean) < 20:
                # Could be first or last name
                return None  # Can't determine without context
            elif len(words) >= 2:
                # Could be full name
                return 'full_name'
        
        # Check for address-like values
        if re.search(r'\d+\s+[A-Za-z]+', value_clean):
            if re.search(r'(street|st|avenue|ave|road|rd|drive|dr|lane|ln)', value_clean.lower()):
                return 'address_line1'
        
        # Check for state abbreviations
        if re.match(r'^[A-Z]{2}$', value_clean):
            return 'state'
        
        return None
    
    def _validate_ssn(self, value: str) -> bool:
        """Validate SSN format and checksum"""
        # Remove non-digits
        ssn = re.sub(r'\D', '', value)
        
        if len(ssn) != 9:
            return False
        
        # Check for invalid patterns
        if ssn[:3] == '000' or ssn[:3] == '666' or ssn[:3] >= '900':
            return False
        if ssn[3:5] == '00':
            return False
        if ssn[5:] == '0000':
            return False
        
        return True
    
    def _validate_ein(self, value: str) -> bool:
        """Validate EIN format"""
        # Remove non-digits
        ein = re.sub(r'\D', '', value)
        
        if len(ein) != 9:
            return False
        
        # EIN should start with valid prefix
        prefix = int(ein[:2])
        valid_prefixes = list(range(1, 7)) + list(range(10, 17)) + list(range(20, 28)) + \
                        list(range(30, 40)) + list(range(40, 49)) + list(range(50, 60)) + \
                        list(range(60, 64)) + list(range(65, 68)) + list(range(71, 74)) + \
                        list(range(75, 78)) + list(range(80, 89)) + list(range(90, 96))
        
        return prefix in valid_prefixes