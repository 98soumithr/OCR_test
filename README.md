# FormPilot (MVP)

Chrome extension + local FastAPI service to extract values from PDFs and autofill web forms with provenance and confidence.

## Monorepo
- `/extension` (React + TS, MV3, Vite)
- `/backend` (Python 3.11+, FastAPI)
- `/shared` (types, schemas)

## Dev
```
# 1) Backend venv
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt

# 2) Extension deps
cd extension && npm install && cd ..

# 3) Run both with HMR
npm run dev
```

## Tests
- Backend: pytest
- Extension: Playwright

## Privacy
Local-only by default. Cloud providers are optional via env keys.
