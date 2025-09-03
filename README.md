# FormPilot

A Chrome extension + local Python service that extracts values from uploaded PDFs and autofills web forms with provenance and confidence tracking.

## Features

- 📄 PDF text extraction with OCR fallback
- 🎯 Smart form field mapping with confidence scoring
- 🔍 Visual PDF preview with field highlighting
- 💾 Site-specific mapping profiles
- 🔒 Privacy-first: local processing by default
- ☁️ Optional cloud providers (Google Document AI, AWS Textract, Azure)
- ✅ Field validation and user approval workflow

## Architecture

```
formpilot/
├── extension/     # Chrome extension (React + TypeScript, MV3)
├── backend/       # Python FastAPI service
├── shared/        # Shared types and schemas
└── docs/          # Documentation and samples
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   cd backend && pip install -r requirements.txt
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```

3. **Load extension in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select `extension/dist/`

4. **Test with sample PDFs:**
   - Upload a PDF in the extension sidebar
   - Navigate to a form page
   - Use "Fill Page" to autofill fields

## Development

- `npm run dev` - Start both backend and extension with hot reload
- `npm run test` - Run all tests
- `npm run build` - Build for production
- `npm run lint` - Lint all code

## API Endpoints

- `POST /parse` - Extract fields from PDF
- `GET /preview/{page}` - Get PDF page preview with bbox overlays
- `GET /providers` - List available cloud providers

## Privacy & Security

- All processing happens locally by default
- No data is sent to external services without explicit user consent
- API keys for cloud providers are stored locally and encrypted
- Form fill logs are kept locally for debugging

## License

MIT