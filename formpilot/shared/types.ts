// Shared types for FormPilot

export type BoundingBox = [number, number, number, number]; // [x, y, width, height]

export interface Candidate {
  value: string;
  confidence: number;
  bbox: BoundingBox;
  sourceText?: string;
  page: number;
}

export interface Field {
  canonical: string;
  candidates: Candidate[];
  chosen?: Candidate;
  validations: ValidationResult[];
}

export interface ValidationResult {
  rule: string;
  passed: boolean;
  message?: string;
}

export interface ExtractedData {
  fields: Field[];
  tables: TableData[];
  meta: DocumentMeta;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  confidence: number;
  page: number;
  bbox: BoundingBox;
}

export interface DocumentMeta {
  scanned: boolean;
  pages: number;
  extractionMethod: 'text' | 'ocr' | 'cloud';
  processingTime?: number;
}

export interface MappingProfile {
  version: number;
  site: string;
  selectors: Record<string, string[]>;
  lastUpdated?: string;
  autoCreated?: boolean;
}

export interface FormInput {
  selector: string;
  xpath?: string;
  label: string;
  type: string;
  name?: string;
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  required?: boolean;
  value?: string;
  options?: string[]; // for select elements
}

export interface FillResult {
  field: string;
  selector: string;
  success: boolean;
  confidence: number;
  source?: Candidate;
  error?: string;
}

// Canonical field names
export const CANONICAL_FIELDS = [
  'first_name',
  'middle_name',
  'last_name',
  'full_name',
  'dob',
  'ssn',
  'ein',
  'email',
  'phone',
  'address_line1',
  'address_line2',
  'city',
  'state',
  'zip',
  'country',
  'employer',
  'occupation',
  'income',
  'marital_status',
  'gender',
  'citizenship',
  'passport_number',
  'drivers_license',
  'account_number',
  'routing_number',
  'policy_number',
  'member_id',
  'group_number',
  'effective_date',
  'expiration_date',
  'signature',
  'date_signed'
] as const;

export type CanonicalFieldName = typeof CANONICAL_FIELDS[number];

// Cloud provider types
export type CloudProvider = 'google_docai' | 'aws_textract' | 'azure_document';

export interface CloudProviderConfig {
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
  estimatedCost?: number;
}

// Message types for extension communication
export interface ExtensionMessage {
  type: 'SCAN_PAGE' | 'FILL_FIELDS' | 'OVERLAY_BADGES' | 'GET_MAPPING' | 'SAVE_MAPPING' | 'EXTRACT_PDF';
  payload?: any;
}

export interface ScanPageResponse {
  inputs: FormInput[];
  url: string;
  timestamp: string;
}

export interface FillFieldsRequest {
  mappings: Record<string, string>;
  data: Field[];
  autoFillThreshold?: number;
}