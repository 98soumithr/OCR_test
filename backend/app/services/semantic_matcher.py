"""
Semantic field matching using sentence transformers
"""
import asyncio
from typing import List, Tuple, Optional, Dict
import numpy as np

from shared.src.constants import FIELD_SYNONYMS, CANONICAL_FIELDS

class SemanticMatcher:
    """Semantic matching for field names using sentence transformers"""
    
    def __init__(self):
        self.model = None
        self.canonical_embeddings = None
        self.canonical_names = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize the sentence transformer model"""
        if self._initialized:
            return
        
        try:
            # Import sentence transformers
            from sentence_transformers import SentenceTransformer
            
            # Initialize model in thread to avoid blocking
            def init_model():
                return SentenceTransformer('all-MiniLM-L6-v2')
            
            loop = asyncio.get_event_loop()
            self.model = await loop.run_in_executor(None, init_model)
            
            # Pre-compute embeddings for canonical field names and synonyms
            await self._precompute_embeddings()
            
            self._initialized = True
            print("✅ Semantic matcher initialized")
            
        except ImportError:
            print("⚠️  sentence-transformers not available, semantic matching disabled")
            self._initialized = False
        except Exception as e:
            print(f"❌ Error initializing semantic matcher: {e}")
            self._initialized = False
    
    async def _precompute_embeddings(self):
        """Pre-compute embeddings for all canonical field names and synonyms"""
        if not self.model:
            return
        
        # Collect all field names and synonyms
        all_field_names = []
        canonical_mapping = []
        
        for canonical, synonyms in FIELD_SYNONYMS.items():
            # Add canonical name
            all_field_names.append(canonical.replace('_', ' '))
            canonical_mapping.append(canonical)
            
            # Add synonyms
            for synonym in synonyms:
                all_field_names.append(synonym.replace('_', ' '))
                canonical_mapping.append(canonical)
        
        # Compute embeddings
        def compute_embeddings():
            return self.model.encode(all_field_names)
        
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(None, compute_embeddings)
        
        self.canonical_embeddings = embeddings
        self.canonical_names = canonical_mapping
    
    async def match_field_name(self, field_name: str, top_k: int = 1) -> Tuple[str, float]:
        """
        Find the best canonical field name match using semantic similarity
        
        Args:
            field_name: Input field name to match
            top_k: Number of top matches to return
            
        Returns:
            Tuple of (canonical_name, confidence_score)
        """
        if not self._initialized or not self.model:
            return "unknown", 0.0
        
        # Normalize field name
        normalized_name = field_name.lower().replace('_', ' ').replace('-', ' ')
        
        # Encode the input field name
        def encode_input():
            return self.model.encode([normalized_name])
        
        loop = asyncio.get_event_loop()
        input_embedding = await loop.run_in_executor(None, encode_input)
        
        # Calculate cosine similarity with all canonical embeddings
        def calculate_similarities():
            from sklearn.metrics.pairwise import cosine_similarity
            return cosine_similarity(input_embedding, self.canonical_embeddings)[0]
        
        similarities = await loop.run_in_executor(None, calculate_similarities)
        
        # Find best match
        best_idx = np.argmax(similarities)
        best_score = similarities[best_idx]
        best_canonical = self.canonical_names[best_idx]
        
        return best_canonical, float(best_score)
    
    async def match_multiple_fields(self, field_names: List[str]) -> List[Tuple[str, str, float]]:
        """
        Match multiple field names at once for efficiency
        
        Args:
            field_names: List of field names to match
            
        Returns:
            List of tuples (input_name, canonical_name, confidence)
        """
        if not self._initialized or not self.model:
            return [(name, "unknown", 0.0) for name in field_names]
        
        results = []
        for field_name in field_names:
            canonical, confidence = await self.match_field_name(field_name)
            results.append((field_name, canonical, confidence))
        
        return results
    
    def is_available(self) -> bool:
        """Check if semantic matching is available"""
        return self._initialized and self.model is not None