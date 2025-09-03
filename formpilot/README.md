# FormPilot 🚀

A production-ready Chrome extension + local Python service that extracts values from PDFs and autofills web forms with confidence scores and provenance tracking.

## Features

- **PDF Extraction**: Extract key-value fields, tables, and checkboxes from both scanned and digital PDFs
- **Smart Form Filling**: Automatically map and fill web forms using semantic matching
- **Confidence Scoring**: Visual indicators showing extraction confidence levels
- **Provenance Tracking**: See exactly where each filled value came from in the source PDF
- **Privacy-First**: Default local processing with optional cloud providers
- **Mapping Profiles**: Save and reuse site-specific field mappings
- **Self-Healing**: Automatically adapt when form selectors change

## Architecture

```
formpilot/
├── extension/          # Chrome extension (React + TypeScript)
│   ├── src/
│   │   ├── content/   # DOM scanning and form filling
│   │   ├── sidebar/   # React sidebar UI
│   │   └── background/# Service worker
├── backend/           # Python FastAPI service
│   ├── extraction/    # PDF parsing and OCR
│   ├── main.py       # API endpoints
│   └── models.py     # Data models
├── shared/           # Shared TypeScript types
└── samples/          # Test PDFs and forms
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Chrome browser
- Docker (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/formpilot.git
cd formpilot
```

2. **Install dependencies**
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Extension
cd ../extension
npm install
```

3. **Start development servers**
```bash
# From project root
./scripts/dev.sh

# Or manually:
# Terminal 1 - Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 - Extension
cd extension
npm run dev
```

4. **Load extension in Chrome**
- Open Chrome and navigate to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `extension/dist` folder

## Usage

### Basic Workflow

1. **Upload a PDF**: Click the FormPilot icon and upload a PDF document
2. **Review extracted fields**: Check confidence levels and edit values if needed
3. **Navigate to a form**: Open any web form in the current tab
4. **Map fields**: Use the mapping editor or let FormPilot auto-match fields
5. **Fill the form**: Click "Fill Page" to populate the form with extracted data

### Confidence Levels

- 🟢 **High (≥92%)**: Auto-filled without confirmation
- 🟠 **Medium (80-92%)**: Requires review before filling
- 🔴 **Low (<80%)**: Manual entry required

### Mapping Profiles

FormPilot automatically saves field mappings for each site. To manage mappings:

1. Open the Mapping tab in the sidebar
2. Click "Record Mapping" to enter recording mode
3. Select a field, then click the corresponding form input
4. Save the mapping for future use

## API Documentation

### Backend Endpoints

#### `POST /parse`
Extract fields from a PDF document.

```bash
curl -X POST http://localhost:8000/parse \
  -F "file=@document.pdf" \
  -F "use_cloud=false"
```

#### `GET /preview`
Generate a preview of a PDF page with bbox highlights.

```bash
curl http://localhost:8000/preview?file_id=abc123&page=1
```

#### `GET /providers`
List available cloud providers and their configuration.

#### `POST /providers/{provider}/estimate`
Estimate the cost of using a cloud provider.

### Extension Messages

The extension uses Chrome's messaging API for communication:

```javascript
// Scan current page
chrome.runtime.sendMessage({
  type: 'SCAN_PAGE'
}, response => {
  console.log('Inputs:', response.data);
});

// Fill fields
chrome.runtime.sendMessage({
  type: 'FILL_FIELDS',
  payload: {
    fields: extractedFields,
    mapping: fieldMapping,
    autoFillThreshold: 0.92
  }
});
```

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Cloud Providers (optional)
GOOGLE_DOCAI_KEY=your_key_here
GOOGLE_DOCAI_PROCESSOR_ID=your_processor_id
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AZURE_FORM_KEY=your_key
AZURE_FORM_ENDPOINT=your_endpoint

# OCR Settings
OCR_ENGINE=paddleocr  # or doctr
OCR_CONFIDENCE_THRESHOLD=0.5

# Extraction Settings
AUTO_FILL_THRESHOLD=0.92
REVIEW_THRESHOLD=0.80
```

### Extension Settings

Access settings through the extension sidebar:

- **Privacy Mode**: Enable local-only processing
- **Cloud Providers**: Configure and enable cloud services
- **Confidence Thresholds**: Adjust auto-fill sensitivity
- **Import/Export**: Backup and restore mapping profiles

## Development

### Running Tests

```bash
# Backend tests
cd backend
pytest --cov=. --cov-report=html

# Extension tests
cd extension
npm test

# E2E tests
cd tests
npm install
npx playwright test
```

### Building for Production

```bash
# Build everything
./scripts/build.sh

# Or individually:
# Backend Docker image
docker build -t formpilot-backend backend/

# Extension for Chrome Web Store
cd extension
npm run build
```

### Project Structure

- **Content Script** (`extension/src/content/`): Handles DOM scanning, form filling, and badge overlays
- **Sidebar** (`extension/src/sidebar/`): React app for PDF upload, field review, and mapping
- **Background Worker** (`extension/src/background/`): Manages extension lifecycle and data persistence
- **PDF Parser** (`backend/extraction/parser.py`): Extracts text and performs OCR
- **Field Inference** (`backend/extraction/field_inference.py`): Maps extracted text to canonical field names
- **Validators** (`backend/extraction/validators.py`): Validates field formats (SSN, email, etc.)

## Privacy & Security

- **Local by default**: All processing happens on your machine unless explicitly enabled
- **No data collection**: FormPilot doesn't send any data to external servers
- **Secure storage**: Mappings and logs are stored locally in IndexedDB
- **API key encryption**: Cloud provider keys are stored securely in Chrome storage

## Troubleshooting

### Common Issues

1. **Extension not detecting forms**
   - Ensure the content script is loaded (check DevTools console)
   - Try refreshing the page after installing the extension

2. **PDF extraction failing**
   - Check backend is running (`http://localhost:8000`)
   - Verify PDF is not password-protected
   - For scanned PDFs, ensure good image quality

3. **Low confidence scores**
   - Improve PDF quality (higher resolution for scans)
   - Manually map fields for better accuracy
   - Consider using cloud providers for complex documents

4. **Form not filling correctly**
   - Update field mappings if the form structure changed
   - Check browser console for errors
   - Verify selectors in the mapping profile

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- PaddleOCR for text extraction
- Sentence Transformers for semantic matching
- FastAPI for the backend framework
- React and Vite for the extension UI

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check the [documentation](./docs/)
- Review [sample implementations](./samples/)

---

Built with ❤️ for better form automation