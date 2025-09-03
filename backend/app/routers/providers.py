"""
Cloud provider endpoints and configuration
"""
import os
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.document import ProcessingProvider

router = APIRouter(tags=["providers"])

class ProviderStatus(BaseModel):
    """Status of a cloud provider"""
    provider: ProcessingProvider
    enabled: bool
    configured: bool
    cost_per_page: Optional[float] = None
    estimated_monthly_limit: Optional[int] = None

class CostEstimate(BaseModel):
    """Cost estimation for processing"""
    provider: ProcessingProvider
    pages: int
    cost_per_page: float
    total_cost: float
    currency: str = "USD"

@router.get("/providers/status")
async def get_provider_status() -> Dict[str, ProviderStatus]:
    """Get status of all cloud providers"""
    providers = {}
    
    # Google Document AI
    docai_key = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    docai_project = os.getenv("GOOGLE_CLOUD_PROJECT_ID")
    providers["docai"] = ProviderStatus(
        provider=ProcessingProvider.DOCAI,
        enabled=bool(docai_key and docai_project),
        configured=bool(docai_key and docai_project),
        cost_per_page=0.015,
        estimated_monthly_limit=1000
    )
    
    # AWS Textract
    aws_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY")
    providers["textract"] = ProviderStatus(
        provider=ProcessingProvider.TEXTRACT,
        enabled=bool(aws_key and aws_secret),
        configured=bool(aws_key and aws_secret),
        cost_per_page=0.0015,
        estimated_monthly_limit=10000
    )
    
    # Azure Document Intelligence
    azure_endpoint = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
    azure_key = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")
    providers["azure"] = ProviderStatus(
        provider=ProcessingProvider.AZURE,
        enabled=bool(azure_endpoint and azure_key),
        configured=bool(azure_endpoint and azure_key),
        cost_per_page=0.001,
        estimated_monthly_limit=20000
    )
    
    # Local processing (always available)
    providers["local"] = ProviderStatus(
        provider=ProcessingProvider.LOCAL,
        enabled=True,
        configured=True,
        cost_per_page=0.0
    )
    
    return providers

@router.post("/providers/estimate-cost")
async def estimate_cost(
    provider: ProcessingProvider,
    pages: int
) -> CostEstimate:
    """Estimate processing cost for a given provider and page count"""
    
    cost_map = {
        ProcessingProvider.DOCAI: 0.015,
        ProcessingProvider.TEXTRACT: 0.0015,
        ProcessingProvider.AZURE: 0.001,
        ProcessingProvider.LOCAL: 0.0
    }
    
    cost_per_page = cost_map.get(provider, 0.0)
    total_cost = cost_per_page * pages
    
    return CostEstimate(
        provider=provider,
        pages=pages,
        cost_per_page=cost_per_page,
        total_cost=total_cost
    )

@router.get("/providers/{provider}/test")
async def test_provider(provider: ProcessingProvider):
    """Test connection to a cloud provider"""
    
    if provider == ProcessingProvider.LOCAL:
        return {"status": "success", "message": "Local processing is always available"}
    
    # For cloud providers, we'll implement actual testing later
    # For now, just check if credentials are configured
    
    if provider == ProcessingProvider.DOCAI:
        if not (os.getenv("GOOGLE_APPLICATION_CREDENTIALS") and os.getenv("GOOGLE_CLOUD_PROJECT_ID")):
            raise HTTPException(status_code=400, detail="Google Cloud credentials not configured")
        return {"status": "success", "message": "Google Document AI credentials found"}
    
    elif provider == ProcessingProvider.TEXTRACT:
        if not (os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")):
            raise HTTPException(status_code=400, detail="AWS credentials not configured")
        return {"status": "success", "message": "AWS credentials found"}
    
    elif provider == ProcessingProvider.AZURE:
        if not (os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT") and os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")):
            raise HTTPException(status_code=400, detail="Azure credentials not configured")
        return {"status": "success", "message": "Azure Document Intelligence credentials found"}
    
    else:
        raise HTTPException(status_code=400, detail="Unknown provider")