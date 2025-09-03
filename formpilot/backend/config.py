"""
Configuration settings for FormPilot backend
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Application settings
    app_name: str = "FormPilot Backend"
    debug: bool = False
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    # File storage
    upload_dir: Path = Path("./uploads")
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    
    # OCR settings
    ocr_engine: str = "paddleocr"  # paddleocr or doctr
    ocr_languages: list = ["en"]
    ocr_confidence_threshold: float = 0.5
    
    # Extraction settings
    text_density_threshold: float = 0.1  # Minimum text density to consider as text PDF
    field_confidence_threshold: float = 0.7
    auto_fill_threshold: float = 0.92
    review_threshold: float = 0.80
    
    # Cloud providers (optional)
    google_docai_key: Optional[str] = None
    google_docai_processor_id: Optional[str] = None
    google_docai_location: str = "us"
    
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "us-east-1"
    
    azure_form_key: Optional[str] = None
    azure_form_endpoint: Optional[str] = None
    
    # Embedding model
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_cache_size: int = 1000
    
    # Security
    cors_origins: list = ["chrome-extension://*", "http://localhost:*"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

# Create directories
settings.upload_dir.mkdir(exist_ok=True)