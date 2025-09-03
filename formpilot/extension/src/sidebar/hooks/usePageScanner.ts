import { useState } from 'react';
import { FormInput } from '@shared/types';

export function usePageScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanPage = async (): Promise<FormInput[] | null> => {
    setIsScanning(true);
    setError(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SCAN_CURRENT_TAB'
      });

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Scan failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to scan page';
      setError(message);
      console.error('Scan error:', err);
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  return {
    scanPage,
    isScanning,
    error
  };
}