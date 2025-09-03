# FormPilot Setup Guide

## Quick Start (Recommended)

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install
cd shared && npm install && npm run build && cd ..
cd extension && npm install && cd ..
```

### 2. Start Development Environment

**Option A: Using the startup script**
```bash
python3 start-backend.py
```

**Option B: Manual startup**
```bash
# Terminal 1: Start backend
cd backend
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Build extension (in watch mode)
cd extension  
npm run dev
```

### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension/` directory
5. The FormPilot extension should now appear in your extensions

### 4. Test the Setup

1. **Backend**: Visit http://localhost:8000 - should show "FormPilot API is running"
2. **API Docs**: Visit http://localhost:8000/docs for interactive API documentation
3. **Extension**: Click the FormPilot icon in Chrome toolbar

## Troubleshooting

### Python Dependencies

If you get dependency errors, try installing minimal requirements:

```bash
pip install fastapi uvicorn pydantic python-multipart PyMuPDF pillow python-dotenv --break-system-packages
```

### Extension Build Issues

```bash
cd extension
rm -rf node_modules dist
npm install
npm run build
```

### Backend Not Starting

1. Check Python version: `python3 --version` (should be 3.11+)
2. Check if port 8000 is available: `lsof -i :8000`
3. Try running with explicit Python path: `/usr/bin/python3 start-backend.py`

## Development Workflow

### Making Changes

1. **Backend changes**: Server auto-reloads with `--reload` flag
2. **Extension changes**: Run `npm run dev` in extension directory for watch mode
3. **Shared types**: Run `npm run build` in shared directory after changes

### Testing

```bash
# Backend tests
cd backend && python3 -m pytest

# Extension tests  
cd extension && npm test

# E2E tests
cd extension && npm run e2e
```

## Production Build

```bash
# Build everything
npm run build

# Extension will be in extension/dist/
# Backend can be deployed as-is or containerized
```

## Optional: Cloud Providers

To enable cloud processing, set environment variables:

```bash
# Google Document AI
export GOOGLE_CLOUD_PROJECT_ID="your-project"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/creds.json"

# AWS Textract  
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"

# Azure Document Intelligence
export AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="https://your-endpoint/"
export AZURE_DOCUMENT_INTELLIGENCE_KEY="your-key"
```

## Architecture Overview

```
FormPilot Flow:
1. User uploads PDF → Backend /parse endpoint
2. Backend extracts fields → Returns structured data
3. Extension sidebar shows fields → User reviews/approves
4. User clicks "Fill Page" → Content script fills form
5. Badges show filled fields → Hover for provenance
```

## File Structure

```
formpilot/
├── package.json          # Root package with scripts
├── start-backend.py      # Simple backend launcher
├── dev.sh               # Full dev environment script
├── extension/           # Chrome extension
│   ├── manifest.json    # Extension manifest
│   ├── src/
│   │   ├── content/     # Content script
│   │   ├── background/  # Service worker
│   │   ├── sidebar/     # React sidebar app
│   │   └── popup/       # Extension popup
├── backend/             # Python FastAPI service
│   ├── main.py          # FastAPI app entry point
│   ├── app/
│   │   ├── services/    # Core services
│   │   ├── routers/     # API endpoints
│   │   └── models/      # Pydantic models
└── shared/              # Shared TypeScript types
    └── src/
        ├── types.ts     # Core types
        ├── validation.ts # Validation rules
        └── constants.ts  # Constants
```

## Next Steps

1. **Test with real PDFs**: Upload actual form PDFs to test extraction
2. **Customize field mappings**: Use the mapping editor for specific sites
3. **Configure cloud providers**: Add API keys for better OCR accuracy
4. **Extend field types**: Add custom field types in shared/constants.ts
5. **Improve matching**: Enhance semantic matching algorithm