/**
 * PDF Preview Component with field highlighting
 */

import React, { useState, useEffect } from 'react';
import { ParseResult } from '@shared/types';
import { useFormPilotStore } from '../stores/formPilotStore';
import { Button } from './ui/Button';
import { ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';

interface PDFPreviewProps {
  documentId: string | null;
  parseResult: ParseResult | null;
  selectedFields: string[];
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  documentId,
  parseResult,
  selectedFields
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load preview when document or page changes
  useEffect(() => {
    if (documentId && currentPage) {
      loadPreview();
    }
  }, [documentId, currentPage, selectedFields]);

  const loadPreview = async () => {
    if (!documentId) return;
    
    setIsLoading(true);
    try {
      const highlightFields = selectedFields.join(',');
      const url = `http://localhost:8000/api/v1/preview/${documentId}/${currentPage}?highlight_fields=${highlightFields}&scale=${zoom}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        // Clean up previous URL
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        
        setPreviewUrl(objectUrl);
      } else {
        throw new Error('Failed to load preview');
      }
    } catch (error) {
      console.error('FormPilot: Error loading preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handlePageChange = (delta: number) => {
    if (!parseResult) return;
    
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= parseResult.meta.total_pages) {
      setCurrentPage(newPage);
    }
  };

  if (!documentId || !parseResult) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <div className="text-lg font-medium">No document loaded</div>
          <div className="text-sm">Upload a PDF to see the preview</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleZoomIn}
            disabled={zoom >= 3.0}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handlePageChange(-1)}
            disabled={currentPage <= 1}
          >
            ←
          </Button>
          <span className="text-sm text-gray-600 min-w-20 text-center">
            {currentPage} / {parseResult.meta.total_pages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handlePageChange(1)}
            disabled={currentPage >= parseResult.meta.total_pages}
          >
            →
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
              <div className="text-gray-600">Loading preview...</div>
            </div>
          </div>
        ) : previewUrl ? (
          <div className="flex justify-center">
            <img
              src={previewUrl}
              alt={`PDF page ${currentPage}`}
              className="max-w-full h-auto shadow-lg rounded"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-lg font-medium">Preview not available</div>
              <div className="text-sm">Unable to load PDF preview</div>
            </div>
          </div>
        )}
      </div>

      {/* Field Legend */}
      {selectedFields.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Highlighted Fields:
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedFields.map(fieldName => (
              <span
                key={fieldName}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
              >
                {fieldName.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};