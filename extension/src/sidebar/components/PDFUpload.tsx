import React, { useCallback, useState } from 'react';

interface PDFUploadProps {
  onUpload: (file: File) => void;
}

const PDFUpload: React.FC<PDFUploadProps> = ({ onUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file.');
      return;
    }

    setIsUploading(true);
    onUpload(file);
    
    // Reset uploading state after a delay
    setTimeout(() => setIsUploading(false), 2000);
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');

    if (pdfFile) {
      handleFileSelect(pdfFile);
    } else {
      alert('Please drop a PDF file.');
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    document.getElementById('file-input')?.click();
  }, []);

  return (
    <div className="upload-container">
      <div
        className={`upload-area ${isDragOver ? 'dragover' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <div className="upload-icon">📄</div>
        <div className="upload-text">
          {isUploading ? 'Processing PDF...' : 'Drop PDF here or click to browse'}
        </div>
        <div className="upload-subtext">
          Supported formats: PDF (scanned or digital)
        </div>
      </div>
      
      <input
        id="file-input"
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileInputChange}
        className="file-input"
      />
      
      <div className="upload-info">
        <h3>How it works:</h3>
        <ol>
          <li>Upload a PDF form or document</li>
          <li>FormPilot extracts field values with confidence scores</li>
          <li>Review and approve extracted fields</li>
          <li>Click "Fill Page" to autofill the current web form</li>
        </ol>
      </div>
    </div>
  );
};

export default PDFUpload;