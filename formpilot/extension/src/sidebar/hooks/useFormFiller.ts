import { useState } from 'react';
import { Field, FillResult } from '@shared/types';

export function useFormFiller() {
  const [isFilling, setIsFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillForm = async (
    fields: Field[],
    mapping: Record<string, string[]>
  ): Promise<FillResult[] | null> => {
    setIsFilling(true);
    setError(null);

    try {
      // Get settings
      const settings = await chrome.storage.local.get(['autoFillThreshold']);
      const threshold = settings.autoFillThreshold || 0.92;

      // Convert mapping format
      const flatMapping: Record<string, string> = {};
      for (const [field, selectors] of Object.entries(mapping)) {
        if (selectors.length > 0) {
          flatMapping[field] = selectors[0]; // Use first selector
        }
      }

      // Send to background for processing
      const response = await chrome.runtime.sendMessage({
        type: 'FILL_CURRENT_TAB',
        payload: {
          fields,
          mapping: flatMapping,
          autoFillThreshold: threshold
        }
      });

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Fill failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fill form';
      setError(message);
      console.error('Fill error:', err);
      return null;
    } finally {
      setIsFilling(false);
    }
  };

  return {
    fillForm,
    isFilling,
    error
  };
}