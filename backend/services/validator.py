"""
Field validation service with regex patterns and checksums
"""

import re
from typing import List
from datetime import datetime
import phonenumbers
from email_validator import validate_email, EmailNotValidError

from ..shared import Field, Validation, CANONICAL_FIELDS


class FieldValidator:
    """Validates extracted field values using various rules"""
    
    def __init__(self):
        # Validation patterns
        self.patterns = {
            CANONICAL_FIELDS.EMAIL: r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
            CANONICAL_FIELDS.PHONE: r'^\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$',
            CANONICAL_FIELDS.SSN: r'^\d{3}-?\d{2}-?\d{4}$',
            CANONICAL_FIELDS.ZIP: r'^\d{5}(?:-\d{4})?$',
            CANONICAL_FIELDS.DATE_OF_BIRTH: r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$',
        }
        
        # SSN validation (basic checksum)
        self.ssn_invalid_prefixes = {
            '000', '666', '900-999'  # Invalid SSN prefixes
        }
    
    async def validate_field(self, field: Field) -> List[Validation]:
        """
        Validate a field's chosen candidate value
        
        Args:
            field: Field to validate
            
        Returns:
            List of validation results
        """
        validations = []
        
        if not field.chosen:
            return validations
        
        value = field.chosen.value
        canonical = field.canonical
        
        # Format validation
        if canonical in self.patterns:
            pattern = self.patterns[canonical]
            is_valid_format = bool(re.match(pattern, value))
            validations.append(Validation(
                rule="format",
                passed=is_valid_format,
                message="Invalid format" if not is_valid_format else None
            ))
        
        # Field-specific validations
        if canonical == CANONICAL_FIELDS.EMAIL:
            validations.extend(self._validate_email(value))
        elif canonical == CANONICAL_FIELDS.PHONE:
            validations.extend(self._validate_phone(value))
        elif canonical == CANONICAL_FIELDS.SSN:
            validations.extend(self._validate_ssn(value))
        elif canonical == CANONICAL_FIELDS.DATE_OF_BIRTH:
            validations.extend(self._validate_date(value))
        elif canonical == CANONICAL_FIELDS.ZIP:
            validations.extend(self._validate_zip(value))
        
        return validations
    
    def _validate_email(self, email: str) -> List[Validation]:
        """Validate email address"""
        validations = []
        
        try:
            # Use email-validator for comprehensive validation
            validate_email(email)
            validations.append(Validation(
                rule="email_syntax",
                passed=True
            ))
        except EmailNotValidError as e:
            validations.append(Validation(
                rule="email_syntax",
                passed=False,
                message=str(e)
            ))
        
        return validations
    
    def _validate_phone(self, phone: str) -> List[Validation]:
        """Validate phone number"""
        validations = []
        
        try:
            # Parse phone number (assume US format)
            parsed = phonenumbers.parse(phone, "US")
            is_valid = phonenumbers.is_valid_number(parsed)
            
            validations.append(Validation(
                rule="phone_valid",
                passed=is_valid,
                message="Invalid phone number" if not is_valid else None
            ))
            
            # Check if it's a mobile number
            is_mobile = phonenumbers.number_type(parsed) == phonenumbers.PhoneNumberType.MOBILE
            validations.append(Validation(
                rule="phone_type",
                passed=is_mobile,
                message="Not a mobile number" if not is_mobile else None
            ))
            
        except phonenumbers.NumberParseException as e:
            validations.append(Validation(
                rule="phone_parse",
                passed=False,
                message=f"Could not parse phone number: {str(e)}"
            ))
        
        return validations
    
    def _validate_ssn(self, ssn: str) -> List[Validation]:
        """Validate SSN"""
        validations = []
        
        # Remove dashes for processing
        clean_ssn = ssn.replace('-', '')
        
        # Check length
        if len(clean_ssn) != 9:
            validations.append(Validation(
                rule="ssn_length",
                passed=False,
                message="SSN must be 9 digits"
            ))
            return validations
        
        # Check for invalid prefixes
        prefix = clean_ssn[:3]
        if prefix in self.ssn_invalid_prefixes or prefix.startswith('9'):
            validations.append(Validation(
                rule="ssn_prefix",
                passed=False,
                message="Invalid SSN prefix"
            ))
        else:
            validations.append(Validation(
                rule="ssn_prefix",
                passed=True
            ))
        
        # Check for all zeros
        if clean_ssn == '000000000':
            validations.append(Validation(
                rule="ssn_all_zeros",
                passed=False,
                message="SSN cannot be all zeros"
            ))
        else:
            validations.append(Validation(
                rule="ssn_all_zeros",
                passed=True
            ))
        
        return validations
    
    def _validate_date(self, date_str: str) -> List[Validation]:
        """Validate date format and range"""
        validations = []
        
        # Try to parse the date
        try:
            # Handle different date formats
            for fmt in ['%m/%d/%Y', '%m-%d-%Y', '%m/%d/%y', '%m-%d-%y']:
                try:
                    parsed_date = datetime.strptime(date_str, fmt)
                    break
                except ValueError:
                    continue
            else:
                validations.append(Validation(
                    rule="date_format",
                    passed=False,
                    message="Invalid date format"
                ))
                return validations
            
            # Check if date is reasonable (not in future, not too old)
            now = datetime.now()
            if parsed_date > now:
                validations.append(Validation(
                    rule="date_future",
                    passed=False,
                    message="Date cannot be in the future"
                ))
            else:
                validations.append(Validation(
                    rule="date_future",
                    passed=True
                ))
            
            # Check if date is not too old (e.g., before 1900)
            if parsed_date.year < 1900:
                validations.append(Validation(
                    rule="date_range",
                    passed=False,
                    message="Date is too old"
                ))
            else:
                validations.append(Validation(
                    rule="date_range",
                    passed=True
                ))
                
        except Exception as e:
            validations.append(Validation(
                rule="date_parse",
                passed=False,
                message=f"Could not parse date: {str(e)}"
            ))
        
        return validations
    
    def _validate_zip(self, zip_code: str) -> List[Validation]:
        """Validate ZIP code"""
        validations = []
        
        # Basic format validation (already done by regex)
        validations.append(Validation(
            rule="zip_format",
            passed=True
        ))
        
        # Check for valid US ZIP code ranges
        if len(zip_code) == 5:
            zip_num = int(zip_code)
            if 10000 <= zip_num <= 99999:
                validations.append(Validation(
                    rule="zip_range",
                    passed=True
                ))
            else:
                validations.append(Validation(
                    rule="zip_range",
                    passed=False,
                    message="Invalid ZIP code range"
                ))
        
        return validations