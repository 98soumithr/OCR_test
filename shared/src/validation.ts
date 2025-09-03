import { CANONICAL_FIELDS } from './types';

export interface ValidationResult {
  rule: string;
  passed: boolean;
  message?: string;
}

export interface ValidationRule {
  rule: string;
  validate: (value: string) => { passed: boolean; message?: string };
}

// SSN validation with checksum
export const validateSSN = (value: string): { passed: boolean; message?: string } => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length !== 9) {
    return { passed: false, message: 'SSN must be 9 digits' };
  }
  
  // Basic format validation (no 000, 666, 900-999 in first 3 digits)
  const area = parseInt(cleaned.substring(0, 3));
  if (area === 0 || area === 666 || area >= 900) {
    return { passed: false, message: 'Invalid SSN area number' };
  }
  
  return { passed: true };
};

// EIN validation
export const validateEIN = (value: string): { passed: boolean; message?: string } => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length !== 9) {
    return { passed: false, message: 'EIN must be 9 digits' };
  }
  
  // EIN format: XX-XXXXXXX where first two digits have specific rules
  const prefix = parseInt(cleaned.substring(0, 2));
  const validPrefixes = [1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24, 25, 26, 27, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 71, 72, 73, 74, 75, 76, 77, 80, 81, 82, 83, 84, 85, 86, 87, 88, 90, 91, 92, 93, 94, 95, 98, 99];
  
  if (!validPrefixes.includes(prefix)) {
    return { passed: false, message: 'Invalid EIN prefix' };
  }
  
  return { passed: true };
};

// Email validation
export const validateEmail = (value: string): { passed: boolean; message?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { passed: false, message: 'Invalid email format' };
  }
  return { passed: true };
};

// Phone validation
export const validatePhone = (value: string): { passed: boolean; message?: string } => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length < 10 || cleaned.length > 11) {
    return { passed: false, message: 'Phone number must be 10-11 digits' };
  }
  return { passed: true };
};

// ZIP code validation
export const validateZipCode = (value: string): { passed: boolean; message?: string } => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipRegex.test(value)) {
    return { passed: false, message: 'ZIP code must be 5 digits or 5+4 format' };
  }
  return { passed: true };
};

// Date validation
export const validateDate = (value: string): { passed: boolean; message?: string } => {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { passed: false, message: 'Invalid date format' };
  }
  return { passed: true };
};

// Validation rules mapping
export const VALIDATION_RULES: Record<string, ValidationRule[]> = {
  [CANONICAL_FIELDS.SSN]: [
    { rule: 'ssn_format', validate: validateSSN }
  ],
  [CANONICAL_FIELDS.EIN]: [
    { rule: 'ein_format', validate: validateEIN }
  ],
  [CANONICAL_FIELDS.EMAIL]: [
    { rule: 'email_format', validate: validateEmail }
  ],
  [CANONICAL_FIELDS.PHONE]: [
    { rule: 'phone_format', validate: validatePhone }
  ],
  [CANONICAL_FIELDS.MOBILE_PHONE]: [
    { rule: 'phone_format', validate: validatePhone }
  ],
  [CANONICAL_FIELDS.WORK_PHONE]: [
    { rule: 'phone_format', validate: validatePhone }
  ],
  [CANONICAL_FIELDS.ZIP_CODE]: [
    { rule: 'zip_format', validate: validateZipCode }
  ],
  [CANONICAL_FIELDS.DATE_OF_BIRTH]: [
    { rule: 'date_format', validate: validateDate }
  ],
  [CANONICAL_FIELDS.DATE]: [
    { rule: 'date_format', validate: validateDate }
  ]
};

// Helper function to validate a field value
export const validateFieldValue = (canonical: string, value: string): ValidationResult[] => {
  const rules = VALIDATION_RULES[canonical] || [];
  return rules.map(rule => ({
    rule: rule.rule,
    ...rule.validate(value)
  }));
};