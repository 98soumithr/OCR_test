export type BBox = [number, number, number, number]; // x0, y0, x1, y1 (PDF coordinate space)

export interface Candidate {
  /** Extracted value */
  value: string;
  /** Model-estimated confidence (0-1) */
  confidence: number;
  /** Bounding box on the PDF page */
  bbox: BBox;
  /** Optional raw source text (for scanned docs) */
  sourceText?: string;
  /** 1-indexed page number */
  page: number;
}

export interface ValidationResult {
  /** Name of the validation rule e.g. "regex:ssn" */
  rule: string;
  /** Whether the value passed validation */
  passed: boolean;
  /** Optional message if validation failed */
  message?: string;
}

export interface Field {
  /** Canonical field identifier (snake_case) */
  canonical: string;
  /** Candidate extractions sorted by confidence */
  candidates: Candidate[];
  /** Chosen candidate (user-approved) */
  chosen?: Candidate;
  /** Validation results */
  validations: ValidationResult[];
}