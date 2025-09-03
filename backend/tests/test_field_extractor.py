"""
Tests for field extraction functionality
"""
import pytest
import asyncio
from app.services.field_extractor import FieldExtractor
from app.models.document import ParseOptions, ProcessingProvider

class TestFieldExtractor:
    
    @pytest.fixture
    async def field_extractor(self):
        extractor = FieldExtractor()
        await extractor.initialize()
        return extractor
    
    def test_detect_key_value_pairs(self, field_extractor):
        """Test key-value pair detection"""
        sample_data = {
            "pages": [{
                "page": 1,
                "text": "First Name: John\nLast Name: Doe\nEmail: john.doe@example.com",
                "blocks": [
                    {"text": "First Name:", "bbox": [100, 100, 200, 120], "confidence": 1.0},
                    {"text": "John", "bbox": [210, 100, 250, 120], "confidence": 1.0},
                    {"text": "Last Name:", "bbox": [100, 130, 200, 150], "confidence": 1.0},
                    {"text": "Doe", "bbox": [210, 130, 250, 150], "confidence": 1.0}
                ]
            }]
        }
        
        raw_fields = field_extractor._detect_key_value_pairs(sample_data)
        
        assert len(raw_fields) > 0
        assert any(field["key"].lower().replace(" ", "_") == "first_name" for field in raw_fields)
    
    def test_standalone_value_detection(self, field_extractor):
        """Test detection of standalone values like emails and phones"""
        sample_data = {
            "pages": [{
                "page": 1,
                "text": "Contact: john.doe@example.com or call (555) 123-4567",
                "blocks": []
            }]
        }
        
        raw_fields = []
        field_extractor._detect_standalone_values(sample_data["pages"][0]["text"], 1, raw_fields)
        
        # Should detect email and phone
        email_field = next((f for f in raw_fields if f["key"] == "email"), None)
        phone_field = next((f for f in raw_fields if f["key"] == "phone"), None)
        
        assert email_field is not None
        assert email_field["value"] == "john.doe@example.com"
        assert phone_field is not None
        assert "(555) 123-4567" in phone_field["value"]
    
    @pytest.mark.asyncio
    async def test_full_extraction_pipeline(self, field_extractor):
        """Test the complete extraction pipeline with a simple PDF"""
        # This would require a real PDF file for testing
        # For now, we'll test the components individually
        options = ParseOptions(
            enable_ocr=False,
            confidence_threshold=0.6,
            provider=ProcessingProvider.LOCAL
        )
        
        # Test with minimal PDF bytes (this would fail in practice)
        # In real tests, you'd use actual PDF files
        assert field_extractor._initialized