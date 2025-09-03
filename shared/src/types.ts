import { z } from 'zod';

// Core data structures
export const CandidateSchema = z.object({
  value: z.string(),
  confidence: z.number().min(0).max(1),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]), // [x1, y1, x2, y2]
  sourceText: z.string().optional(),
  page: z.number().int().min(1)
});

export const ValidationSchema = z.object({
  rule: z.string(),
  passed: z.boolean(),
  message: z.string().optional()
});

export const FieldSchema = z.object({
  canonical: z.string(),
  candidates: z.array(CandidateSchema),
  chosen: CandidateSchema.optional(),
  validations: z.array(ValidationSchema)
});

export const TableCellSchema = z.object({
  value: z.string(),
  confidence: z.number().min(0).max(1),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  rowIndex: z.number().int().min(0),
  colIndex: z.number().int().min(0)
});

export const TableSchema = z.object({
  headers: z.array(z.string()),
  cells: z.array(z.array(TableCellSchema)),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  page: z.number().int().min(1)
});

export const DocumentMetaSchema = z.object({
  isScanned: z.boolean(),
  totalPages: z.number().int().min(1),
  processingTime: z.number().optional(),
  provider: z.enum(['local', 'docai', 'textract', 'azure']).optional()
});

export const ParseResultSchema = z.object({
  fields: z.array(FieldSchema),
  tables: z.array(TableSchema),
  meta: DocumentMetaSchema
});

// DOM and mapping types
export const DOMInputSchema = z.object({
  selector: z.string(),
  type: z.enum(['text', 'email', 'tel', 'number', 'date', 'select', 'textarea', 'checkbox', 'radio']),
  label: z.string(),
  placeholder: z.string().optional(),
  name: z.string().optional(),
  id: z.string().optional(),
  ariaLabel: z.string().optional(),
  xpath: z.string(),
  associatedText: z.string().optional() // Nearby text content
});

export const MappingProfileSchema = z.object({
  version: z.number().int().min(1),
  site: z.string().url(),
  path: z.string().optional(),
  selectors: z.record(z.string(), z.array(z.string())), // canonical_name -> [selector1, selector2]
  lastUpdated: z.string().datetime(),
  confidence: z.number().min(0).max(1).optional() // Overall profile confidence
});

export const FillMappingSchema = z.object({
  fieldCanonical: z.string(),
  domSelector: z.string(),
  confidence: z.number().min(0).max(1),
  method: z.enum(['exact_match', 'semantic_match', 'fuzzy_match', 'profile_match'])
});

export const CloudProviderConfigSchema = z.object({
  provider: z.enum(['docai', 'textract', 'azure']),
  enabled: z.boolean(),
  apiKey: z.string().optional(),
  region: z.string().optional(),
  estimatedCostPerPage: z.number().optional()
});

// API request/response schemas
export const ParseRequestSchema = z.object({
  file: z.instanceof(File).or(z.string()), // File object or base64
  provider: z.enum(['local', 'docai', 'textract', 'azure']).optional(),
  options: z.object({
    enableOCR: z.boolean().optional(),
    confidence_threshold: z.number().min(0).max(1).optional()
  }).optional()
});

export const PreviewRequestSchema = z.object({
  documentId: z.string(),
  page: z.number().int().min(1),
  highlightFields: z.array(z.string()).optional() // canonical field names to highlight
});

// Type exports
export type Candidate = z.infer<typeof CandidateSchema>;
export type Validation = z.infer<typeof ValidationSchema>;
export type Field = z.infer<typeof FieldSchema>;
export type TableCell = z.infer<typeof TableCellSchema>;
export type Table = z.infer<typeof TableSchema>;
export type DocumentMeta = z.infer<typeof DocumentMetaSchema>;
export type ParseResult = z.infer<typeof ParseResultSchema>;
export type DOMInput = z.infer<typeof DOMInputSchema>;
export type MappingProfile = z.infer<typeof MappingProfileSchema>;
export type FillMapping = z.infer<typeof FillMappingSchema>;
export type CloudProviderConfig = z.infer<typeof CloudProviderConfigSchema>;
export type ParseRequest = z.infer<typeof ParseRequestSchema>;
export type PreviewRequest = z.infer<typeof PreviewRequestSchema>;

// Canonical field names enum for consistency
export const CANONICAL_FIELDS = {
  // Personal Information
  FIRST_NAME: 'first_name',
  LAST_NAME: 'last_name',
  MIDDLE_NAME: 'middle_name',
  FULL_NAME: 'full_name',
  DATE_OF_BIRTH: 'date_of_birth',
  SSN: 'ssn',
  EIN: 'ein',
  
  // Contact Information
  EMAIL: 'email',
  PHONE: 'phone',
  MOBILE_PHONE: 'mobile_phone',
  WORK_PHONE: 'work_phone',
  
  // Address
  ADDRESS_LINE1: 'address_line1',
  ADDRESS_LINE2: 'address_line2',
  CITY: 'city',
  STATE: 'state',
  ZIP_CODE: 'zip_code',
  COUNTRY: 'country',
  
  // Employment
  EMPLOYER: 'employer',
  JOB_TITLE: 'job_title',
  ANNUAL_INCOME: 'annual_income',
  
  // Financial
  BANK_ACCOUNT: 'bank_account',
  ROUTING_NUMBER: 'routing_number',
  
  // Other
  SIGNATURE: 'signature',
  DATE: 'date'
} as const;

export type CanonicalFieldName = typeof CANONICAL_FIELDS[keyof typeof CANONICAL_FIELDS];