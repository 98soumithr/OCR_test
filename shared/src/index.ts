// Export all types and schemas
export * from './Field';
export * from './Mapping';

// Re-export commonly used types for convenience
export type {
  Field,
  Candidate,
  Validation,
  Table,
  ProcessingMeta,
  ParseResponse,
  CanonicalFieldName
} from './Field';

export type {
  MappingProfile,
  FormField,
  FieldMatch,
  FillResult
} from './Mapping';

export { CANONICAL_FIELDS } from './Field';