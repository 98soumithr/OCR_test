# FormPilot Deployment Guide

## Production Deployment

### Backend Deployment

#### Option 1: Docker (Recommended)

```bash
# Build Docker image
docker build -t formpilot-backend .

# Run container
docker run -d \
  --name formpilot \
  -p 8000:8000 \
  -e DEBUG=false \
  -e CORS_ORIGINS='["https://yourdomain.com"]' \
  formpilot-backend
```

#### Option 2: Direct Python Deployment

```bash
# Install production dependencies
pip install -r backend/requirements.txt

# Set environment variables
export DEBUG=false
export HOST=0.0.0.0
export PORT=8000

# Start with gunicorn for production
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app --bind 0.0.0.0:8000
```

#### Option 3: Cloud Deployment

**AWS Lambda** (with Mangum):
```bash
pip install mangum
# Deploy using AWS SAM or Serverless Framework
```

**Google Cloud Run**:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Extension Distribution

#### Chrome Web Store

1. **Prepare for submission**:
   ```bash
   cd extension
   npm run build
   zip -r formpilot-extension.zip dist/ manifest.json icons/
   ```

2. **Update manifest for production**:
   ```json
   {
     "host_permissions": [
       "https://your-backend-domain.com/*"
     ]
   }
   ```

3. **Submit to Chrome Web Store**:
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Upload `formpilot-extension.zip`
   - Fill out store listing details
   - Submit for review

#### Enterprise Distribution

For internal company use:
```bash
# Create enterprise package
cd extension
npm run build
# Distribute via Google Admin Console
```

## Environment Configuration

### Production Environment Variables

```bash
# Backend Configuration
DEBUG=false
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS='["https://yourdomain.com", "chrome-extension://*"]'
MAX_FILE_SIZE_MB=50

# Cloud Providers (Optional)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-api-key

# Security (if needed)
JWT_SECRET_KEY=your-secret-key
RATE_LIMIT_PER_MINUTE=60
```

### SSL/TLS Configuration

For production, ensure HTTPS:

```nginx
# Nginx configuration
server {
    listen 443 ssl;
    server_name your-api-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring & Logging

### Application Monitoring

```python
# Add to backend/main.py
import logging
from fastapi import Request
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s")
    return response
```

### Error Tracking

Consider integrating:
- Sentry for error tracking
- DataDog for performance monitoring
- CloudWatch for AWS deployments

## Security Considerations

### Backend Security

1. **Rate Limiting**:
   ```python
   from slowapi import Limiter, _rate_limit_exceeded_handler
   from slowapi.util import get_remote_address
   
   limiter = Limiter(key_func=get_remote_address)
   app.state.limiter = limiter
   app.add_exception_handler(429, _rate_limit_exceeded_handler)
   
   @limiter.limit("10/minute")
   @app.post("/api/v1/parse")
   async def parse_document(...):
   ```

2. **File Validation**:
   - Implement virus scanning
   - Validate PDF structure
   - Limit file sizes

3. **API Authentication** (if needed):
   ```python
   from fastapi.security import HTTPBearer
   
   security = HTTPBearer()
   
   @app.post("/api/v1/parse")
   async def parse_document(token: str = Depends(security)):
       # Validate token
   ```

### Extension Security

1. **Content Security Policy**:
   ```json
   {
     "content_security_policy": {
       "extension_pages": "script-src 'self'; object-src 'self'"
     }
   }
   ```

2. **Permissions Review**:
   - Minimize required permissions
   - Use `activeTab` instead of broad host permissions
   - Regular security audits

## Performance Optimization

### Backend Optimization

1. **Caching**:
   ```python
   from functools import lru_cache
   
   @lru_cache(maxsize=100)
   def get_field_embeddings(text: str):
       # Cache expensive computations
   ```

2. **Background Processing**:
   ```python
   from fastapi import BackgroundTasks
   
   @app.post("/api/v1/parse")
   async def parse_document(background_tasks: BackgroundTasks, ...):
       background_tasks.add_task(cleanup_old_documents)
   ```

3. **Database Integration** (for scale):
   ```python
   # Replace in-memory storage with PostgreSQL/MongoDB
   from sqlalchemy import create_engine
   ```

### Extension Optimization

1. **Lazy Loading**: Load components only when needed
2. **Debounced Updates**: Prevent excessive DOM scanning
3. **Memory Management**: Clean up event listeners and observers

## Scaling Considerations

### Horizontal Scaling

- Load balancer for multiple backend instances
- Shared storage (Redis/PostgreSQL) for session data
- CDN for static assets

### Vertical Scaling

- Increase CPU/memory for ML model inference
- GPU acceleration for OCR processing
- SSD storage for temporary file processing

## Backup & Recovery

### Data Backup

```bash
# Backup user mappings and settings
curl http://localhost:8000/api/v1/export/mappings > mappings-backup.json

# Restore mappings
curl -X POST http://localhost:8000/api/v1/import/mappings -d @mappings-backup.json
```

### Disaster Recovery

- Regular database backups
- Configuration management
- Automated deployment pipelines
- Health check monitoring

## Compliance & Privacy

### GDPR Compliance

- Data processing notices
- User consent mechanisms  
- Data deletion capabilities
- Privacy policy updates

### Enterprise Features

- SSO integration
- Audit logging
- Data residency controls
- Custom field validation rules