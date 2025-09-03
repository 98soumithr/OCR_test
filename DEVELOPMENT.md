# FormPilot Development Guide

## Quick Start

1. **Clone and setup:**
   ```bash
   git clone <repository>
   cd formpilot
   npm install
   ```

2. **Start development environment:**
   ```bash
   ./scripts/dev.sh
   ```

3. **Load extension in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select `extension/dist/`

4. **Test with sample forms:**
   - Open `samples/test-form.html` in Chrome
   - Upload a PDF in the extension sidebar
   - Test the autofill functionality

## Architecture Overview

```
formpilot/
├── extension/          # Chrome extension (React + TypeScript)
│   ├── src/
│   │   ├── content/    # Content script for DOM manipulation
│   │   ├── background/ # Service worker for messaging
│   │   ├── sidebar/    # React sidebar application
│   │   └── utils/      # Utility functions
│   └── dist/           # Built extension files
├── backend/            # Python FastAPI service
│   ├── services/       # PDF processing services
│   ├── tests/          # Backend tests
│   └── main.py         # FastAPI application
├── shared/             # Shared TypeScript types
│   └── src/            # Type definitions and schemas
└── samples/            # Test forms and sample PDFs
```

## Development Workflow

### Backend Development

1. **Start backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python -m uvicorn main:app --reload
   ```

2. **Run tests:**
   ```bash
   cd backend
   pytest tests/ -v
   ```

3. **API documentation:**
   - Visit `http://localhost:8000/docs` for interactive API docs

### Extension Development

1. **Start extension dev server:**
   ```bash
   cd extension
   npm run dev
   ```

2. **Run tests:**
   ```bash
   cd extension
   npm test
   ```

3. **Lint code:**
   ```bash
   cd extension
   npm run lint
   ```

### Shared Types

1. **Build shared types:**
   ```bash
   cd shared
   npm run build
   ```

2. **Watch for changes:**
   ```bash
   cd shared
   npm run dev
   ```

## Key Features

### PDF Processing Pipeline

1. **Text Extraction:** Uses PyMuPDF for digital PDFs
2. **OCR Fallback:** Uses PaddleOCR for scanned documents
3. **Field Detection:** Pattern matching and NLP for field identification
4. **Validation:** Regex patterns and checksums for data validation

### Form Field Mapping

1. **Semantic Matching:** Uses sentence transformers for field matching
2. **CSS Selectors:** Site-specific mapping profiles
3. **Self-Healing:** Automatic selector updates when forms change
4. **Manual Override:** User can manually map fields

### Privacy & Security

1. **Local Processing:** All data processed locally by default
2. **Optional Cloud:** Cloud providers only used when explicitly enabled
3. **No Data Storage:** No personal data stored on servers
4. **Encrypted Storage:** API keys encrypted in local storage

## Testing

### Unit Tests

- **Backend:** `pytest` with coverage reporting
- **Extension:** `vitest` with React Testing Library
- **Shared:** TypeScript compilation tests

### Integration Tests

- **API Tests:** FastAPI test client
- **Extension Tests:** Chrome extension messaging
- **End-to-End:** Playwright for full user workflows

### Test Data

- **Sample PDFs:** Located in `samples/` directory
- **Test Forms:** HTML forms for testing autofill
- **Mock Data:** Generated test data for various scenarios

## Deployment

### Development

```bash
./scripts/dev.sh
```

### Production Build

```bash
./scripts/build.sh
```

### Extension Distribution

1. Build the extension: `cd extension && npm run build`
2. Load `extension/dist/` in Chrome
3. Package for Chrome Web Store (if needed)

### Backend Deployment

1. Install dependencies: `pip install -r requirements.txt`
2. Set environment variables for cloud providers
3. Deploy to your preferred platform (AWS, GCP, Azure, etc.)

## Configuration

### Environment Variables

```bash
# Backend
GOOGLE_DOCAI_API_KEY=your_key_here
GOOGLE_DOCAI_PROJECT_ID=your_project_id
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AZURE_FORM_RECOGNIZER_KEY=your_key_here
AZURE_FORM_RECOGNIZER_ENDPOINT=your_endpoint_here
```

### Extension Settings

- **API Endpoint:** Backend server URL
- **Confidence Threshold:** Minimum confidence for auto-fill
- **Cloud Providers:** Enable/disable cloud processing
- **Auto-fill:** Enable/disable automatic form filling

## Troubleshooting

### Common Issues

1. **Extension not loading:**
   - Check Chrome developer console for errors
   - Verify manifest.json is valid
   - Ensure all files are built correctly

2. **Backend connection failed:**
   - Check if backend is running on correct port
   - Verify CORS settings
   - Check network connectivity

3. **PDF processing errors:**
   - Verify PDF file is not corrupted
   - Check if OCR dependencies are installed
   - Review backend logs for specific errors

4. **Form fields not detected:**
   - Check if form has proper labels
   - Verify CSS selectors in mapping profile
   - Test with different confidence thresholds

### Debug Mode

Enable debug logging by setting:
```javascript
localStorage.setItem('formpilot_debug', 'true');
```

### Logs

- **Backend:** Check console output or log files
- **Extension:** Check Chrome developer tools console
- **Content Script:** Check page console for content script logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Style

- **TypeScript:** Use strict mode and proper typing
- **Python:** Follow PEP 8 guidelines
- **React:** Use functional components with hooks
- **Tests:** Write comprehensive tests for all features

## License

MIT License - see LICENSE file for details.