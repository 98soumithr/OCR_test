"""
Field validation rules and validators
"""

import re
from typing import List
from datetime import datetime

from models import ValidationResult

class FieldValidator:
    """Validate extracted field values"""
    
    def validate_field(self, field_name: str, value: str) -> List[ValidationResult]:
        """
        Validate a field value based on its canonical name
        """
        validations = []
        
        # Get validators for this field type
        validators = self._get_validators(field_name)
        
        for validator_name, validator_func in validators:
            passed, message = validator_func(value)
            validations.append(ValidationResult(
                rule=validator_name,
                passed=passed,
                message=message
            ))
        
        return validations
    
    def _get_validators(self, field_name: str) -> List[tuple]:
        """Get validators for a specific field type"""
        validators_map = {
            'ssn': [
                ('format', self._validate_ssn_format),
                ('checksum', self._validate_ssn_checksum)
            ],
            'ein': [
                ('format', self._validate_ein_format)
            ],
            'email': [
                ('format', self._validate_email_format)
            ],
            'phone': [
                ('format', self._validate_phone_format)
            ],
            'zip': [
                ('format', self._validate_zip_format)
            ],
            'dob': [
                ('format', self._validate_date_format),
                ('range', self._validate_dob_range)
            ],
            'state': [
                ('format', self._validate_state_format)
            ]
        }
        
        return validators_map.get(field_name, [])
    
    def _validate_ssn_format(self, value: str) -> tuple[bool, str]:
        """Validate SSN format"""
        pattern = re.compile(r'^\d{3}-?\d{2}-?\d{4}$')
        if pattern.match(value):
            return True, "Valid SSN format"
        return False, "Invalid SSN format (expected: XXX-XX-XXXX)"
    
    def _validate_ssn_checksum(self, value: str) -> tuple[bool, str]:
        """Validate SSN checksum and known invalid patterns"""
        ssn = re.sub(r'\D', '', value)
        
        if len(ssn) != 9:
            return False, "SSN must be 9 digits"
        
        # Check for invalid patterns
        if ssn[:3] == '000' or ssn[:3] == '666' or int(ssn[:3]) >= 900:
            return False, "Invalid SSN area number"
        if ssn[3:5] == '00':
            return False, "Invalid SSN group number"
        if ssn[5:] == '0000':
            return False, "Invalid SSN serial number"
        
        return True, "Valid SSN"
    
    def _validate_ein_format(self, value: str) -> tuple[bool, str]:
        """Validate EIN format"""
        pattern = re.compile(r'^\d{2}-?\d{7}$')
        if pattern.match(value):
            ein = re.sub(r'\D', '', value)
            prefix = int(ein[:2])
            
            # Valid EIN prefixes
            valid_prefixes = list(range(1, 7)) + list(range(10, 17)) + list(range(20, 28)) + \
                           list(range(30, 40)) + list(range(40, 49)) + list(range(50, 60)) + \
                           list(range(60, 64)) + list(range(65, 68)) + list(range(71, 74)) + \
                           list(range(75, 78)) + list(range(80, 89)) + list(range(90, 96))
            
            if prefix in valid_prefixes:
                return True, "Valid EIN format"
            return False, f"Invalid EIN prefix: {prefix}"
        return False, "Invalid EIN format (expected: XX-XXXXXXX)"
    
    def _validate_email_format(self, value: str) -> tuple[bool, str]:
        """Validate email format"""
        pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        if pattern.match(value):
            return True, "Valid email format"
        return False, "Invalid email format"
    
    def _validate_phone_format(self, value: str) -> tuple[bool, str]:
        """Validate phone number format"""
        # Remove non-digits
        digits = re.sub(r'\D', '', value)
        
        if len(digits) == 10:
            return True, "Valid US phone number"
        elif len(digits) == 11 and digits[0] == '1':
            return True, "Valid US phone number with country code"
        else:
            return False, f"Invalid phone number length: {len(digits)} digits"
    
    def _validate_zip_format(self, value: str) -> tuple[bool, str]:
        """Validate ZIP code format"""
        pattern = re.compile(r'^\d{5}(-\d{4})?$')
        if pattern.match(value):
            return True, "Valid ZIP code format"
        return False, "Invalid ZIP code format (expected: XXXXX or XXXXX-XXXX)"
    
    def _validate_date_format(self, value: str) -> tuple[bool, str]:
        """Validate date format"""
        # Try common date formats
        formats = [
            '%m/%d/%Y',
            '%m-%d-%Y',
            '%Y-%m-%d',
            '%m/%d/%y',
            '%m-%d-%y',
            '%d/%m/%Y',
            '%d-%m-%Y'
        ]
        
        for fmt in formats:
            try:
                datetime.strptime(value, fmt)
                return True, f"Valid date format ({fmt})"
            except ValueError:
                continue
        
        return False, "Invalid date format"
    
    def _validate_dob_range(self, value: str) -> tuple[bool, str]:
        """Validate date of birth is in reasonable range"""
        # Try to parse date
        formats = ['%m/%d/%Y', '%m-%d-%Y', '%Y-%m-%d', '%m/%d/%y', '%m-%d-%y']
        
        for fmt in formats:
            try:
                date = datetime.strptime(value, fmt)
                
                # Check if date is reasonable (between 1900 and today)
                if date.year < 1900:
                    return False, "Date of birth before 1900"
                if date > datetime.now():
                    return False, "Date of birth in the future"
                
                age = (datetime.now() - date).days / 365.25
                if age > 120:
                    return False, "Age over 120 years"
                
                return True, f"Valid date of birth (age: {int(age)})"
            except ValueError:
                continue
        
        return False, "Cannot parse date of birth"
    
    def _validate_state_format(self, value: str) -> tuple[bool, str]:
        """Validate US state abbreviation"""
        states = [
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
            'DC', 'PR', 'VI', 'GU', 'AS'
        ]
        
        if value.upper() in states:
            return True, "Valid US state abbreviation"
        return False, f"Invalid state abbreviation: {value}"