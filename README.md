# FormPilot

A production-ready Chrome extension with local Python service that extracts values from uploaded PDFs and autofills web forms with confidence and provenance tracking.

## Features

- 🔍 **Smart PDF Extraction**: Handles both digital and scanned PDFs with OCR fallback
- 🎯 **Intelligent Form Filling**: Semantic matching of PDF fields to form inputs
- 📊 **Confidence Tracking**: Shows extraction confidence and validation results
- 🗺️ **Site Mapping Profiles**: Learns and saves site-specific field mappings
- 🔒 **Privacy-First**: Local processing by default, optional cloud providers
- 📱 **Modern UI**: React-based sidebar with PDF preview and field management

## Architecture

```
formpilot/
├── extension/          # Chrome Extension (React + TypeScript)
│   ├── src/
│   │   ├── content/    # Content script for DOM interaction
│   │   ├── background/ # Service worker for messaging
│   │   ├── sidebar/    # React sidebar application
│   │   └── popup/      # Extension popup
├── backend/            # Python FastAPI service
│   ├── app/
│   │   ├── services/   # Core processing services
│   │   ├── routers/    # API endpoints
│   │   └── models/     # Data models
└── shared/             # Shared TypeScript types
    └── src/
        ├── types.ts    # Core type definitions
        ├── validation.ts # Field validation rules
        └── constants.ts  # Shared constants
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Chrome browser

### Installation

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Start development servers**:
   ```bash
   npm run dev
   ```
   This starts both the FastAPI backend (port 8000) and extension build watcher.

3. **Load extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension/` directory

### Development Workflow

- **Backend**: FastAPI with hot reload on `http://localhost:8000`
- **Extension**: Vite build watcher for instant updates
- **Types**: Shared TypeScript types across frontend and backend

## API Endpoints

### Core Endpoints

- `POST /api/v1/parse` - Upload and parse PDF documents
- `GET /api/v1/preview/{doc_id}/{page}` - Generate PDF preview with field highlighting
- `GET /api/v1/providers/status` - Check cloud provider configuration

### Usage Example

```bash
# Upload a PDF for processing
curl -X POST http://localhost:8000/api/v1/parse \
  -F "file=@document.pdf" \
  -F "provider=local" \
  -F "enable_ocr=true"

# Get preview with field highlighting
curl "http://localhost:8000/api/v1/preview/{doc_id}/1?highlight_fields=first_name,last_name"
```

## Extension Usage

1. **Upload PDF**: Click the FormPilot icon and upload a PDF document
2. **Review Fields**: Extracted fields appear in the sidebar with confidence scores
3. **Fill Forms**: Navigate to any web form and click "Fill Page"
4. **Verify Results**: Filled inputs show ✓ badges with provenance on hover
5. **Save Mappings**: Use the mapping editor to improve accuracy for specific sites

## Field Extraction Pipeline

1. **Text Layer Extraction**: Try PyMuPDF text extraction first
2. **OCR Fallback**: Use PaddleOCR for scanned documents
3. **Pattern Detection**: Find key-value pairs and standalone values
4. **Semantic Matching**: Map to canonical field names using ML
5. **Validation**: Apply field-specific validation rules
6. **Confidence Scoring**: Assign confidence scores for auto-fill decisions

## Supported Field Types

- Personal: `first_name`, `last_name`, `date_of_birth`, `ssn`, `ein`
- Contact: `email`, `phone`, `mobile_phone`, `work_phone`
- Address: `address_line1`, `address_line2`, `city`, `state`, `zip_code`
- Employment: `employer`, `job_title`, `annual_income`
- Financial: `bank_account`, `routing_number`

## Cloud Providers (Optional)

Configure environment variables to enable cloud processing:

### Google Document AI
```bash
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
```

### AWS Textract
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
```

### Azure Document Intelligence
```bash
export AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="https://your-resource.cognitiveservices.azure.com/"
export AZURE_DOCUMENT_INTELLIGENCE_KEY="your-api-key"
```

## Testing

```bash
# Run backend tests
npm run backend:test

# Run extension tests
npm run extension:test

# Run end-to-end tests
npm run e2e
```

## Building for Production

```bash
# Build all components
npm run build

# Extension will be in extension/dist/
# Backend can be deployed as a Docker container or Python service
```

## Privacy & Security

- **Local-first**: All processing happens locally by default
- **No data retention**: Documents are automatically cleaned up after 24 hours
- **Explicit consent**: Cloud providers require explicit opt-in and API key configuration
- **No tracking**: No analytics or telemetry data collection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.