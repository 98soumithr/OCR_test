export type BBox = [number, number, number, number];

export type Candidate = {
  value: string;
  confidence: number;
  bbox: BBox;
  sourceText?: string;
  page: number;
};

export type Validation = {
  rule: string;
  passed: boolean;
  message?: string;
};

export type Field = {
  canonical: string;
  candidates: Candidate[];
  chosen?: Candidate;
  validations: Validation[];
};

export type MappingProfile = {
  version: number;
  site: string;
  selectors: Record<string, string[]>;
};

export type ParsedResponse = {
  fields: Field[];
  tables: Array<Record<string, string>[]>;
  meta: {
    scanned: boolean;
    pages: number;
    file_id: string;
  };
};
