import { z } from 'zod';

/**
 * Bounding box coordinates [x, y, width, height] in PDF coordinates
 */
export type BoundingBox = [number, number, number, number];

/**
 * A candidate value extracted from the PDF with metadata
 */
export interface Candidate {
  /** The extracted text value */
  value: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Bounding box in PDF coordinates */
  bbox: BoundingBox;
  /** Source text context around the value */
  sourceText?: string;
  /** Page number where this value was found */
  page: number;
}

/**
 * Validation rule result
 */
export interface Validation {
  /** Name of the validation rule */
  rule: string;
  /** Whether the validation passed */
  passed: boolean;
  /** Optional error message */
  message?: string;
}

/**
 * A field extracted from the PDF
 */
export interface Field {
  /** Canonical field name (e.g., 'first_name', 'ssn') */
  canonical: string;
  /** List of candidate values found */
  candidates: Candidate[];
  /** The chosen candidate (set by user or auto-selected) */
  chosen?: Candidate;
  /** Validation results */
  validations: Validation[];
}

/**
 * Table structure extracted from PDF
 */
export interface Table {
  /** Table identifier */
  id: string;
  /** Page number */
  page: number;
  /** Bounding box of the table */
  bbox: BoundingBox;
  /** Table headers */
  headers: string[];
  /** Table rows */
  rows: string[][];
  /** Confidence score */
  confidence: number;
}

/**
 * Metadata about the PDF processing
 */
export interface ProcessingMeta {
  /** Whether the PDF was scanned (required OCR) */
  scanned: boolean;
  /** Total number of pages */
  pages: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** OCR provider used (if any) */
  ocrProvider?: string;
}

/**
 * Response from the /parse endpoint
 */
export interface ParseResponse {
  /** Extracted fields */
  fields: Field[];
  /** Extracted tables */
  tables: Table[];
  /** Processing metadata */
  meta: ProcessingMeta;
}

/**
 * Zod schemas for validation
 */
export const BoundingBoxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export const CandidateSchema = z.object({
  value: z.string(),
  confidence: z.number().min(0).max(1),
  bbox: BoundingBoxSchema,
  sourceText: z.string().optional(),
  page: z.number().min(1)
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

export const TableSchema = z.object({
  id: z.string(),
  page: z.number().min(1),
  bbox: BoundingBoxSchema,
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  confidence: z.number().min(0).max(1)
});

export const ProcessingMetaSchema = z.object({
  scanned: z.boolean(),
  pages: z.number().min(1),
  processingTime: z.number().min(0),
  ocrProvider: z.string().optional()
});

export const ParseResponseSchema = z.object({
  fields: z.array(FieldSchema),
  tables: z.array(TableSchema),
  meta: ProcessingMetaSchema
});

/**
 * Canonical field names for form mapping
 */
export const CANONICAL_FIELDS = {
  // Personal information
  FIRST_NAME: 'first_name',
  LAST_NAME: 'last_name',
  MIDDLE_NAME: 'middle_name',
  FULL_NAME: 'full_name',
  
  // Contact information
  EMAIL: 'email',
  PHONE: 'phone',
  ADDRESS_LINE1: 'address_line1',
  ADDRESS_LINE2: 'address_line2',
  CITY: 'city',
  STATE: 'state',
  ZIP: 'zip',
  COUNTRY: 'country',
  
  // Identity
  SSN: 'ssn',
  EIN: 'ein',
  DATE_OF_BIRTH: 'dob',
  DRIVERS_LICENSE: 'drivers_license',
  
  // Financial
  BANK_ACCOUNT: 'bank_account',
  ROUTING_NUMBER: 'routing_number',
  CREDIT_CARD: 'credit_card',
  
  // Other
  SIGNATURE: 'signature',
  DATE: 'date',
  AMOUNT: 'amount',
  REFERENCE_NUMBER: 'reference_number'
} as const;

export type CanonicalFieldName = typeof CANONICAL_FIELDS[keyof typeof CANONICAL_FIELDS];