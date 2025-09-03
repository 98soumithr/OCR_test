import React, { useState, useEffect } from 'react';
import { Field } from '@shared/Field';

interface PDFPreviewProps {
  selectedField: Field | null;
  fields: Field[];
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ selectedField, fields }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Mock PDF preview - in production, this would fetch from the backend
  useEffect(() => {
    if (fields.length > 0) {
      // Simulate loading preview
      setIsLoading(true);
      
      // Create a mock preview image
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add some mock content
        ctx.fillStyle = '#333333';
        ctx.font = '16px Arial';
        ctx.fillText('Sample PDF Form', 20, 40);
        
        ctx.font = '12px Arial';
        ctx.fillText('First Name: John', 20, 80);
        ctx.fillText('Last Name: Doe', 20, 100);
        ctx.fillText('Email: john.doe@example.com', 20, 120);
        ctx.fillText('Phone: (555) 123-4567', 20, 140);
        
        // Highlight selected field if any
        if (selectedField && selectedField.chosen) {
          const fieldY = 80 + (fields.indexOf(selectedField) * 20);
          ctx.strokeStyle = '#1976d2';
          ctx.lineWidth = 2;
          ctx.strokeRect(15, fieldY - 15, 370, 20);
        }
      }
      
      setPreviewImage(canvas.toDataURL());
      setTotalPages(1);
      setIsLoading(false);
    }
  }, [fields, selectedField]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // In production, fetch new page from backend
    }
  };

  const handleZoomIn = () => {
    // In production, implement zoom functionality
    console.log('Zoom in');
  };

  const handleZoomOut = () => {
    // In production, implement zoom functionality
    console.log('Zoom out');
  };

  if (fields.length === 0) {
    return (
      <div className="pdf-preview">
        <div className="pdf-preview-placeholder">
          <div className="icon">📄</div>
          <div className="text">No PDF loaded</div>
          <div className="subtext">Upload a PDF to see preview</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-preview">
      <div className="preview-header">
        <div className="page-controls">
          <button
            className="btn btn-small btn-secondary"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            ←
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-small btn-secondary"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            →
          </button>
        </div>
        
        <div className="zoom-controls">
          <button
            className="btn btn-small btn-secondary"
            onClick={handleZoomOut}
          >
            −
          </button>
          <span className="zoom-info">100%</span>
          <button
            className="btn btn-small btn-secondary"
            onClick={handleZoomIn}
          >
            +
          </button>
        </div>
      </div>

      <div className="preview-content">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading preview...</div>
          </div>
        ) : previewImage ? (
          <img
            src={previewImage}
            alt="PDF Preview"
            className="preview-image"
          />
        ) : (
          <div className="pdf-preview-placeholder">
            <div className="icon">📄</div>
            <div className="text">Preview not available</div>
          </div>
        )}
      </div>

      {selectedField && (
        <div className="field-details">
          <h4>Selected Field</h4>
          <div className="field-info">
            <div className="info-item">
              <span className="info-label">Name:</span>
              <span className="info-value">{selectedField.canonical}</span>
            </div>
            {selectedField.chosen && (
              <>
                <div className="info-item">
                  <span className="info-label">Value:</span>
                  <span className="info-value">{selectedField.chosen.value}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Confidence:</span>
                  <span className="info-value">
                    {Math.round(selectedField.chosen.confidence * 100)}%
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Page:</span>
                  <span className="info-value">{selectedField.chosen.page}</span>
                </div>
                {selectedField.chosen.sourceText && (
                  <div className="info-item">
                    <span className="info-label">Source:</span>
                    <span className="info-value">{selectedField.chosen.sourceText}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFPreview;