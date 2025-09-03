import { useState } from 'react';
import { ExtractedData } from '@shared/types';

export function useExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractPDF = async (file: File): Promise<ExtractedData | null> => {
    setIsExtracting(true);
    setError(null);

    try {
      // Get settings
      const settings = await chrome.storage.local.get(['cloudEnabled', 'selectedProvider']);
      
      // Send to background for processing
      const response = await chrome.runtime.sendMessage({
        type: 'EXTRACT_PDF',
        payload: {
          file,
          useCloud: settings.cloudEnabled || false,
          cloudProvider: settings.selectedProvider
        }
      });

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Extraction failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract PDF';
      setError(message);
      console.error('Extraction error:', err);
      return null;
    } finally {
      setIsExtracting(false);
    }
  };

  return {
    extractPDF,
    isExtracting,
    error
  };
}