// Field synonyms for semantic matching
export const FIELD_SYNONYMS: Record<string, string[]> = {
  first_name: ['fname', 'firstname', 'given_name', 'forename', 'first'],
  last_name: ['lname', 'lastname', 'surname', 'family_name', 'last'],
  middle_name: ['mname', 'middlename', 'middle_initial', 'mi'],
  full_name: ['name', 'fullname', 'complete_name', 'legal_name'],
  date_of_birth: ['dob', 'birthdate', 'birth_date', 'birthday'],
  ssn: ['social_security', 'social_security_number', 'social'],
  ein: ['employer_identification', 'tax_id', 'federal_tax_id'],
  email: ['email_address', 'e_mail', 'electronic_mail'],
  phone: ['telephone', 'phone_number', 'tel'],
  mobile_phone: ['cell', 'cellular', 'mobile', 'cell_phone'],
  work_phone: ['business_phone', 'office_phone', 'work_tel'],
  address_line1: ['address', 'street', 'street_address', 'addr1'],
  address_line2: ['address2', 'apt', 'apartment', 'suite', 'unit', 'addr2'],
  city: ['town', 'municipality'],
  state: ['province', 'region', 'st'],
  zip_code: ['zip', 'postal_code', 'postcode'],
  country: ['nation'],
  employer: ['company', 'organization', 'workplace'],
  job_title: ['title', 'position', 'role', 'occupation'],
  annual_income: ['income', 'salary', 'yearly_income', 'gross_income'],
  bank_account: ['account_number', 'account_num', 'acct_num'],
  routing_number: ['routing', 'routing_num', 'aba_number'],
  signature: ['sig', 'sign'],
  date: ['current_date', 'today']
};

// Confidence thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.92,     // Auto-fill
  MEDIUM: 0.80,   // Highlight for confirmation
  LOW: 0.60       // Show but don't auto-fill
} as const;

// Common input selectors for form detection
export const FORM_SELECTORS = [
  'input[type="text"]',
  'input[type="email"]',
  'input[type="tel"]',
  'input[type="number"]',
  'input[type="date"]',
  'input[type="password"]',
  'input:not([type])', // Default to text
  'select',
  'textarea',
  'input[type="checkbox"]',
  'input[type="radio"]'
] as const;

// Provider cost estimates (per page)
export const PROVIDER_COSTS = {
  docai: 0.015,      // $15 per 1000 pages
  textract: 0.0015,  // $1.50 per 1000 pages
  azure: 0.001       // $1 per 1000 pages
} as const;