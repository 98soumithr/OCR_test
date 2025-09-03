/**
 * File Upload Component
 */

import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { ParseResult } from '@shared/types';
import { Button } from './ui/Button';

interface FileUploadProps {
  onUploadComplete: (result: ParseResult, documentId: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.includes('pdf')) {
      setUploadError('Please upload a PDF file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setUploadError('File size must be less than 50MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Convert file to base64 for messaging
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1]; // Remove data:application/pdf;base64, prefix
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Send to background script for processing
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'UPLOAD_PDF',
          file: base64,
          filename: file.name
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      if (response.success) {
        onUploadComplete(response.parseResult, response.documentId);
      } else {
        throw new Error(response.error || 'Upload failed');
      }

    } catch (error) {
      console.error('FormPilot: Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  return (
    <div className="h-full flex flex-col">
      {/* Upload Area */}
      <div
        className={`
          flex-1 flex flex-col items-center justify-center
          border-2 border-dashed rounded-lg p-8 text-center
          transition-colors duration-200
          ${dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300'}
          ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-primary-400'}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
            <div className="text-gray-600">
              <div className="font-medium">Processing PDF...</div>
              <div className="text-sm">Extracting fields and analyzing content</div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <Upload className="w-12 h-12 text-gray-400" />
            <div className="text-gray-600">
              <div className="font-medium text-lg">Upload a PDF</div>
              <div className="text-sm mt-1">
                Drag and drop or click to select a PDF file
              </div>
              <div className="text-xs mt-2 text-gray-500">
                Max size: 50MB • Supports scanned and digital PDFs
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {uploadError && (
        <div className="mt-4 p-4 bg-error-50 border border-error-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-error-600" />
            <div className="text-error-700 font-medium">Upload Error</div>
          </div>
          <div className="text-error-600 text-sm mt-1">{uploadError}</div>
          <Button
            onClick={() => setUploadError(null)}
            className="mt-2 text-sm formpilot-button-secondary"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Recent Documents */}
      <RecentDocuments onDocumentSelect={(doc) => {
        onUploadComplete(doc.parseResult, doc.id);
      }} />
    </div>
  );
};

interface RecentDocumentsProps {
  onDocumentSelect: (document: any) => void;
}

const RecentDocuments: React.FC<RecentDocumentsProps> = ({ onDocumentSelect }) => {
  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      return new Promise<any[]>((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_DOCUMENTS' }, (response) => {
          resolve(response.documents || []);
        });
      });
    }
  });

  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Documents</h3>
      <div className="space-y-2">
        {documents.slice(0, 3).map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-3 bg-white rounded border border-gray-200 hover:border-primary-300 cursor-pointer transition-colors"
            onClick={() => onDocumentSelect(doc)}
          >
            <div className="flex items-center space-x-3">
              <FileText className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {doc.filename}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            {doc.parseResult && (
              <CheckCircle className="w-4 h-4 text-success-600" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};