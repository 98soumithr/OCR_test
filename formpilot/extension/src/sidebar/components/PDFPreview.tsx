import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Field } from '@shared/types';

interface PDFPreviewProps {
  field: Field;
  pageNumber: number;
}

export function PDFPreview({ field, pageNumber }: PDFPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPreview();
  }, [field, pageNumber]);

  const loadPreview = async () => {
    setIsLoading(true);
    try {
      // TODO: Load actual preview from backend
      // For now, show placeholder
      setPreviewUrl(null);
    } catch (error) {
      console.error('Failed to load preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-gray-100 rounded"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-gray-100 rounded"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm text-gray-600">
          Page {pageNumber + 1}
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading preview...</div>
          </div>
        ) : previewUrl ? (
          <div
            className="inline-block"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
            <img src={previewUrl} alt="PDF Preview" className="max-w-full" />
            {/* Highlight bounding box */}
            {field.chosen && (
              <div
                className="absolute border-2 border-primary-500 bg-primary-500 bg-opacity-20"
                style={{
                  left: `${field.chosen.bbox[0]}px`,
                  top: `${field.chosen.bbox[1]}px`,
                  width: `${field.chosen.bbox[2]}px`,
                  height: `${field.chosen.bbox[3]}px`,
                }}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Move className="w-12 h-12 mb-4" />
            <p>PDF preview will appear here</p>
            <p className="text-sm mt-2">Selected field will be highlighted</p>
          </div>
        )}
      </div>
    </div>
  );
}