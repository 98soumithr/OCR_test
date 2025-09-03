# FormPilot API Documentation

## Overview

FormPilot provides a REST API for PDF processing and form field extraction. The API is built with FastAPI and provides endpoints for PDF parsing, field extraction, and cloud provider integration.

## Base URL

- **Development:** `http://localhost:8000`
- **Production:** `https://your-domain.com`

## Authentication

Currently, the API does not require authentication for local development. In production, you may want to add API key authentication.

## Endpoints

### Health Check

#### GET /

Check if the API is running.

**Response:**
```json
{
  "message": "FormPilot API is running",
  "version": "1.0.0"
}
```

### PDF Processing

#### POST /parse

Extract form fields from a PDF file.

**Parameters:**
- `file` (form-data): PDF file to process
- `use_cloud` (query, optional): Whether to use cloud providers (default: false)
- `cloud_provider` (query, optional): Specific cloud provider to use (google, aws, azure)

**Request:**
```bash
curl -X POST "http://localhost:8000/parse" \
  -F "file=@sample.pdf" \
  -F "use_cloud=false"
```

**Response:**
```json
{
  "fields": [
    {
      "canonical": "first_name",
      "candidates": [
        {
          "value": "John",
          "confidence": 0.95,
          "bbox": [100, 200, 150, 20],
          "sourceText": "First Name: John",
          "page": 1
        }
      ],
      "chosen": {
        "value": "John",
        "confidence": 0.95,
        "bbox": [100, 200, 150, 20],
        "sourceText": "First Name: John",
        "page": 1
      },
      "validations": [
        {
          "rule": "format",
          "passed": true,
          "message": null
        }
      ]
    }
  ],
  "tables": [],
  "meta": {
    "scanned": false,
    "pages": 1,
    "processingTime": 1250,
    "ocrProvider": null
  }
}
```

### PDF Preview

#### GET /preview/{page}

Get a preview image of a PDF page with optional field highlighting.

**Parameters:**
- `page` (path): Page number (1-indexed)
- `file_id` (query): File identifier
- `highlight_fields` (query, optional): Comma-separated list of field names to highlight

**Response:**
Returns a PNG image of the PDF page with highlighted fields.

### Cloud Providers

#### GET /providers

Get the status of all available cloud providers.

**Response:**
```json
{
  "google": {
    "enabled": true,
    "configured": true,
    "endpoint": "https://us-documentai.googleapis.com",
    "region": "us"
  },
  "aws": {
    "enabled": false,
    "configured": false,
    "endpoint": "https://textract.us-east-1.amazonaws.com",
    "region": "us-east-1"
  },
  "azure": {
    "enabled": false,
    "configured": false,
    "endpoint": null,
    "region": null
  }
}
```

#### GET /providers/{provider}/cost

Estimate the cost for processing with a specific cloud provider.

**Parameters:**
- `provider` (path): Cloud provider name (google, aws, azure)
- `pages` (query): Number of pages to process
- `use_ocr` (query, optional): Whether OCR will be needed (default: false)

**Response:**
```json
{
  "provider": "google",
  "pages": 5,
  "use_ocr": true,
  "base_cost": 0.0075,
  "ocr_cost": 0.0075,
  "total_cost": 0.015,
  "currency": "USD",
  "cost_per_page": 0.0015
}
```

## Data Models

### Field

Represents an extracted form field.

```typescript
interface Field {
  canonical: string;           // Canonical field name (e.g., 'first_name')
  candidates: Candidate[];     // List of candidate values
  chosen?: Candidate;          // Selected candidate value
  validations: Validation[];   // Validation results
}
```

### Candidate

Represents a candidate value for a field.

```typescript
interface Candidate {
  value: string;                    // Extracted text value
  confidence: number;               // Confidence score (0-1)
  bbox: [number, number, number, number]; // Bounding box [x, y, width, height]
  sourceText?: string;              // Context around the value
  page: number;                     // Page number where found
}
```

### Validation

Represents a validation result for a field.

```typescript
interface Validation {
  rule: string;        // Validation rule name
  passed: boolean;     // Whether validation passed
  message?: string;    // Error message if failed
}
```

### ProcessingMeta

Metadata about the PDF processing.

```typescript
interface ProcessingMeta {
  scanned: boolean;           // Whether PDF was scanned
  pages: number;              // Total number of pages
  processingTime: number;     // Processing time in milliseconds
  ocrProvider?: string;       // OCR provider used (if any)
}
```

## Error Responses

### 400 Bad Request

```json
{
  "detail": "File must be a PDF"
}
```

### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": ["body", "file"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 500 Internal Server Error

```json
{
  "detail": "Processing failed: OCR service unavailable"
}
```

## Rate Limiting

Currently, there are no rate limits implemented. In production, you may want to add rate limiting to prevent abuse.

## CORS

The API includes CORS middleware to allow requests from Chrome extensions and web applications. The allowed origins include:

- `chrome-extension://*`
- `http://localhost:*`

## Cloud Provider Configuration

### Google Document AI

Set the following environment variables:

```bash
GOOGLE_DOCAI_API_KEY=your_api_key
GOOGLE_DOCAI_PROJECT_ID=your_project_id
GOOGLE_DOCAI_LOCATION=us  # Optional, defaults to 'us'
```

### AWS Textract

Set the following environment variables:

```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1  # Optional, defaults to 'us-east-1'
```

### Azure Form Recognizer

Set the following environment variables:

```bash
AZURE_FORM_RECOGNIZER_KEY=your_api_key
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
```

## Examples

### Basic PDF Processing

```python
import requests

# Upload and process a PDF
with open('sample.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/parse',
        files={'file': f}
    )

data = response.json()
print(f"Extracted {len(data['fields'])} fields")
```

### Using Cloud Providers

```python
import requests

# Process PDF using Google Document AI
with open('sample.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/parse',
        files={'file': f},
        params={'use_cloud': True, 'cloud_provider': 'google'}
    )

data = response.json()
print(f"Processing time: {data['meta']['processingTime']}ms")
```

### Cost Estimation

```python
import requests

# Estimate cost for processing
response = requests.get(
    'http://localhost:8000/providers/google/cost',
    params={'pages': 10, 'use_ocr': True}
)

cost_data = response.json()
print(f"Estimated cost: ${cost_data['total_cost']:.4f}")
```

## SDKs

Currently, there are no official SDKs available. The API is designed to be simple enough to use with standard HTTP clients in any language.

## Support

For API support and questions:

1. Check the [Development Guide](DEVELOPMENT.md)
2. Review the [GitHub Issues](https://github.com/your-repo/issues)
3. Contact the development team

## Changelog

### v1.0.0
- Initial API release
- PDF processing with local OCR
- Cloud provider integration
- Field extraction and validation
- Cost estimation endpoints