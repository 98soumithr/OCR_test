/**
 * FormPilot Zustand Store
 * Manages application state including documents, fields, and DOM inputs
 */

import { create } from 'zustand';
import { Field, ParseResult, DOMInput, FillMapping, MappingProfile } from '@shared/types';
import { CONFIDENCE_THRESHOLDS } from '@shared/constants';

interface FormPilotStore {
  // Document state
  currentDocument: string | null;
  parseResult: ParseResult | null;
  
  // Page state
  domInputs: DOMInput[];
  currentUrl: string | null;
  
  // UI state
  selectedFields: string[]; // canonical field names
  isProcessing: boolean;
  error: string | null;
  
  // Mapping state
  currentMappingProfile: MappingProfile | null;
  isRecordingMapping: boolean;
  
  // Actions
  setCurrentDocument: (documentId: string | null) => void;
  setParseResult: (result: ParseResult | null) => void;
  setDomInputs: (inputs: DOMInput[]) => void;
  setSelectedFields: (fields: string[]) => void;
  setError: (error: string | null) => void;
  setCurrentMappingProfile: (profile: MappingProfile | null) => void;
  setIsRecordingMapping: (recording: boolean) => void;
  
  // Complex actions
  scanCurrentPage: () => Promise<void>;
  fillPage: () => Promise<void>;
  generateMappings: () => FillMapping[];
  updateFieldValue: (canonical: string, value: string) => void;
  approveField: (canonical: string) => void;
}

export const useFormPilotStore = create<FormPilotStore>((set, get) => ({
  // Initial state
  currentDocument: null,
  parseResult: null,
  domInputs: [],
  currentUrl: null,
  selectedFields: [],
  isProcessing: false,
  error: null,
  currentMappingProfile: null,
  isRecordingMapping: false,

  // Basic setters
  setCurrentDocument: (documentId) => set({ currentDocument: documentId }),
  setParseResult: (result) => set({ parseResult: result }),
  setDomInputs: (inputs) => set({ domInputs: inputs }),
  setSelectedFields: (fields) => set({ selectedFields: fields }),
  setError: (error) => set({ error }),
  setCurrentMappingProfile: (profile) => set({ currentMappingProfile: profile }),
  setIsRecordingMapping: (recording) => set({ isRecordingMapping: recording }),

  // Scan current page for form inputs
  scanCurrentPage: async () => {
    try {
      set({ isProcessing: true, error: null });
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('No active tab found');
      }
      
      // Send message to content script
      const domInputs = await new Promise<DOMInput[]>((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id!, { type: 'SCAN_PAGE' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response || []);
          }
        });
      });
      
      set({ 
        domInputs, 
        currentUrl: tab.url || null,
        isProcessing: false 
      });
      
      // Load mapping profile for current site
      if (tab.url) {
        const url = new URL(tab.url);
        const response = await new Promise<any>((resolve) => {
          chrome.runtime.sendMessage({
            type: 'GET_MAPPING_PROFILE',
            host: url.host,
            path: url.pathname
          }, resolve);
        });
        
        if (response.profile) {
          set({ currentMappingProfile: response.profile });
        }
      }
      
    } catch (error) {
      console.error('FormPilot: Error scanning page:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to scan page',
        isProcessing: false 
      });
    }
  },

  // Fill the current page with extracted fields
  fillPage: async () => {
    const { parseResult, domInputs } = get();
    
    if (!parseResult || !domInputs.length) {
      throw new Error('No data available for filling');
    }
    
    try {
      set({ isProcessing: true, error: null });
      
      // Generate field mappings
      const mappings = get().generateMappings();
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('No active tab found');
      }
      
      // Send fill command to content script
      await new Promise<void>((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id!, {
          type: 'FILL_FIELDS',
          mappings
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.success) {
            resolve();
          } else {
            reject(new Error(response.error || 'Fill failed'));
          }
        });
      });
      
      // Add badges to show filled fields
      await new Promise<void>((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id!, {
          type: 'OVERLAY_BADGES',
          mappings
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
      
      set({ isProcessing: false });
      
    } catch (error) {
      console.error('FormPilot: Error filling page:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fill page',
        isProcessing: false 
      });
      throw error;
    }
  },

  // Generate field mappings using semantic matching
  generateMappings: (): FillMapping[] => {
    const { parseResult, domInputs, currentMappingProfile } = get();
    
    if (!parseResult || !domInputs.length) {
      return [];
    }
    
    const mappings: FillMapping[] = [];
    
    // Get high-confidence fields that are ready to fill
    const readyFields = parseResult.fields.filter(
      field => field.chosen && field.chosen.confidence >= CONFIDENCE_THRESHOLDS.HIGH
    );
    
    for (const field of readyFields) {
      if (!field.chosen) continue;
      
      // First, try mapping profile if available
      let bestInput: DOMInput | null = null;
      let matchMethod: FillMapping['method'] = 'semantic_match';
      let matchConfidence = 0;
      
      if (currentMappingProfile?.selectors[field.canonical]) {
        const selectors = currentMappingProfile.selectors[field.canonical];
        for (const selector of selectors) {
          const input = domInputs.find(inp => inp.selector === selector);
          if (input) {
            bestInput = input;
            matchMethod = 'profile_match';
            matchConfidence = 0.95;
            break;
          }
        }
      }
      
      // If no profile match, use semantic matching
      if (!bestInput) {
        const matches = domInputs.map(input => ({
          input,
          score: calculateSemanticSimilarity(field.canonical, input.label)
        })).sort((a, b) => b.score - a.score);
        
        if (matches.length > 0 && matches[0].score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
          bestInput = matches[0].input;
          matchConfidence = matches[0].score;
          
          if (matches[0].score >= CONFIDENCE_THRESHOLDS.HIGH) {
            matchMethod = 'exact_match';
          } else {
            matchMethod = 'semantic_match';
          }
        }
      }
      
      if (bestInput && matchConfidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
        mappings.push({
          fieldCanonical: field.canonical,
          domSelector: bestInput.selector,
          confidence: Math.min(field.chosen.confidence, matchConfidence),
          method: matchMethod
        });
      }
    }
    
    return mappings;
  },

  // Update field value (for manual editing)
  updateFieldValue: (canonical, value) => {
    const { parseResult } = get();
    if (!parseResult) return;
    
    const updatedFields = parseResult.fields.map(field => {
      if (field.canonical === canonical && field.chosen) {
        return {
          ...field,
          chosen: {
            ...field.chosen,
            value
          }
        };
      }
      return field;
    });
    
    set({
      parseResult: {
        ...parseResult,
        fields: updatedFields
      }
    });
  },

  // Approve a field for filling
  approveField: (canonical) => {
    const { parseResult } = get();
    if (!parseResult) return;
    
    const updatedFields = parseResult.fields.map(field => {
      if (field.canonical === canonical && field.candidates.length > 0) {
        // If no chosen candidate, choose the highest confidence one
        if (!field.chosen) {
          const bestCandidate = field.candidates.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
          );
          return {
            ...field,
            chosen: bestCandidate
          };
        }
      }
      return field;
    });
    
    set({
      parseResult: {
        ...parseResult,
        fields: updatedFields
      }
    });
  }
}));

// Helper function for semantic similarity (simplified)
function calculateSemanticSimilarity(canonical: string, label: string): number {
  const canonicalWords = canonical.toLowerCase().replace(/_/g, ' ').split(' ');
  const labelWords = label.toLowerCase().split(/\s+/);
  
  let matchCount = 0;
  let totalWords = canonicalWords.length;
  
  for (const canonicalWord of canonicalWords) {
    for (const labelWord of labelWords) {
      if (labelWord.includes(canonicalWord) || canonicalWord.includes(labelWord)) {
        matchCount++;
        break;
      }
    }
  }
  
  return matchCount / totalWords;
}