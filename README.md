# FormPilot

FormPilot is an open-source, privacy-first tool that extracts structured data from PDFs and seamlessly autofills web forms in your browser.

## Monorepo Layout

```
/extension   – Chrome extension (MV3) built with React + Vite
/backend     – FastAPI service for local PDF parsing & optional cloud providers
/shared      – Re-usable shared types & utilities (TypeScript)
```

## Quick Start (Development)

### Prerequisites

* Node.js ≥ 18.x
* Python ≥ 3.11
* pnpm (preferred) or npm/yarn

### Install dependencies

```bash
pnpm install       # installs root + extension workspace deps
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
```

### Run everything (hot-reload)

```bash
pnpm dev           # concurrently launches Vite (extension) & uvicorn (backend)
```

### Building production bundles

```bash
pnpm build         # builds extension bundle
```

## License

MIT © 2023-present FormPilot contributors
