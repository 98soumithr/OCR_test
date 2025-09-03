"""
In-memory document store for managing uploaded PDFs and processing results
"""
import uuid
import hashlib
from typing import Dict, Optional, List
from datetime import datetime, timedelta
import fitz  # PyMuPDF

from app.models.document import ParseResult

class DocumentStore:
    """Manages uploaded documents and their processing results"""
    
    def __init__(self):
        self._documents: Dict[str, bytes] = {}  # document_id -> PDF bytes
        self._results: Dict[str, ParseResult] = {}  # document_id -> ParseResult
        self._metadata: Dict[str, dict] = {}  # document_id -> metadata
        self._cleanup_threshold = timedelta(hours=24)  # Auto-cleanup after 24h
    
    def store_document(self, pdf_bytes: bytes, filename: Optional[str] = None) -> str:
        """Store a PDF document and return its ID"""
        # Generate document ID from content hash + timestamp
        content_hash = hashlib.sha256(pdf_bytes).hexdigest()[:16]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        document_id = f"{content_hash}_{timestamp}"
        
        # Store document
        self._documents[document_id] = pdf_bytes
        self._metadata[document_id] = {
            "filename": filename,
            "uploaded_at": datetime.now(),
            "size": len(pdf_bytes)
        }
        
        # Cleanup old documents
        self._cleanup_old_documents()
        
        return document_id
    
    def get_document(self, document_id: str) -> Optional[bytes]:
        """Retrieve PDF bytes by document ID"""
        return self._documents.get(document_id)
    
    def get_document_info(self, document_id: str) -> Optional[dict]:
        """Get document metadata"""
        return self._metadata.get(document_id)
    
    def store_result(self, document_id: str, result: ParseResult):
        """Store parsing result for a document"""
        self._results[document_id] = result
    
    def get_result(self, document_id: str) -> Optional[ParseResult]:
        """Retrieve parsing result for a document"""
        return self._results.get(document_id)
    
    def delete_document(self, document_id: str) -> bool:
        """Delete a document and its results"""
        deleted = False
        if document_id in self._documents:
            del self._documents[document_id]
            deleted = True
        if document_id in self._results:
            del self._results[document_id]
        if document_id in self._metadata:
            del self._metadata[document_id]
        return deleted
    
    def list_documents(self) -> List[dict]:
        """List all stored documents with metadata"""
        documents = []
        for doc_id, metadata in self._metadata.items():
            has_result = doc_id in self._results
            documents.append({
                "document_id": doc_id,
                "filename": metadata.get("filename"),
                "uploaded_at": metadata["uploaded_at"],
                "size": metadata["size"],
                "has_result": has_result
            })
        return documents
    
    def get_page_count(self, document_id: str) -> Optional[int]:
        """Get number of pages in a PDF document"""
        pdf_bytes = self.get_document(document_id)
        if not pdf_bytes:
            return None
        
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            page_count = len(doc)
            doc.close()
            return page_count
        except Exception:
            return None
    
    def _cleanup_old_documents(self):
        """Remove documents older than cleanup threshold"""
        cutoff_time = datetime.now() - self._cleanup_threshold
        to_delete = []
        
        for doc_id, metadata in self._metadata.items():
            if metadata["uploaded_at"] < cutoff_time:
                to_delete.append(doc_id)
        
        for doc_id in to_delete:
            self.delete_document(doc_id)
            print(f"Cleaned up old document: {doc_id}")
    
    def clear_all(self):
        """Clear all stored documents (for testing)"""
        self._documents.clear()
        self._results.clear()
        self._metadata.clear()