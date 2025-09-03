"""
Tests for FormPilot backend
"""

import pytest
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test the root health check endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "FormPilot API is running"
    assert response.json()["version"] == "1.0.0"


def test_providers_endpoint():
    """Test the providers endpoint"""
    response = client.get("/providers")
    assert response.status_code == 200
    providers = response.json()
    
    # Check that providers are returned
    assert isinstance(providers, dict)
    
    # Check for expected providers
    expected_providers = ["google", "aws", "azure"]
    for provider in expected_providers:
        assert provider in providers


def test_parse_endpoint_no_file():
    """Test the parse endpoint without a file"""
    response = client.post("/parse")
    assert response.status_code == 422  # Validation error


def test_parse_endpoint_invalid_file():
    """Test the parse endpoint with invalid file type"""
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tmp_file:
        tmp_file.write(b"This is not a PDF file")
        tmp_file_path = tmp_file.name
    
    try:
        with open(tmp_file_path, "rb") as f:
            response = client.post("/parse", files={"file": f})
        
        assert response.status_code == 400
        assert "File must be a PDF" in response.json()["detail"]
    finally:
        Path(tmp_file_path).unlink(missing_ok=True)


def test_parse_endpoint_mock_pdf():
    """Test the parse endpoint with a mock PDF file"""
    # Create a minimal PDF file for testing
    pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF"""
    
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
        tmp_file.write(pdf_content)
        tmp_file_path = tmp_file.name
    
    try:
        with open(tmp_file_path, "rb") as f:
            response = client.post("/parse", files={"file": f})
        
        # Should return 200 with parsed data
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "fields" in data
        assert "tables" in data
        assert "meta" in data
        
        # Check metadata
        assert "scanned" in data["meta"]
        assert "pages" in data["meta"]
        assert "processingTime" in data["meta"]
        
    finally:
        Path(tmp_file_path).unlink(missing_ok=True)


def test_cost_estimation():
    """Test cost estimation endpoint"""
    response = client.get("/providers/google/cost?pages=5&use_ocr=true")
    assert response.status_code == 200
    
    data = response.json()
    assert "provider" in data
    assert "estimated_cost" in data
    assert data["provider"] == "google"


def test_cost_estimation_invalid_provider():
    """Test cost estimation with invalid provider"""
    response = client.get("/providers/invalid/cost?pages=5")
    assert response.status_code == 400


def test_preview_endpoint():
    """Test the preview endpoint (not implemented yet)"""
    response = client.get("/preview/1?file_id=test")
    assert response.status_code == 501  # Not implemented


if __name__ == "__main__":
    pytest.main([__file__])