/**
 * FormPilot Background Script / Service Worker
 * Handles messaging, persistence, and coordination between content script and sidebar
 */

import { MappingProfile, Field, ParseResult } from '@shared/types';

interface StoredDocument {
  id: string;
  filename: string;
  uploadedAt: string;
  parseResult?: ParseResult;
}

interface StorageData {
  documents: Record<string, StoredDocument>;
  mappingProfiles: Record<string, MappingProfile>; // host -> profile
  settings: {
    autoFillEnabled: boolean;
    confidenceThreshold: number;
    cloudProvidersEnabled: boolean;
  };
}

class BackgroundService {
  private readonly API_BASE = 'http://localhost:8000/api/v1';
  
  constructor() {
    this.setupMessageHandlers();
    this.setupContextMenus();
    this.initializeStorage();
  }

  private setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'UPLOAD_PDF':
          this.handlePDFUpload(message.file, message.filename)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
          return true; // Async response

        case 'GET_FIELD_VALUE':
          this.getFieldValue(message.canonical, sender.tab?.id)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
          return true;

        case 'GET_MAPPING_PROFILE':
          this.getMappingProfile(message.host, message.path)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
          return true;

        case 'SAVE_MAPPING_PROFILE':
          this.saveMappingProfile(message.profile)
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
          return true;

        case 'GET_DOCUMENTS':
          this.getStoredDocuments()
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
          return true;

        case 'FILL_COMPLETE':
          this.logFillResults(message.results, sender.tab);
          break;

        case 'OPEN_SIDEBAR':
          this.openSidebar(sender.tab?.id);
          break;
      }
    });
  }

  private setupContextMenus() {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.contextMenus.create({
        id: 'formpilot-open',
        title: 'Open FormPilot',
        contexts: ['page']
      });
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'formpilot-open' && tab?.id) {
        this.openSidebar(tab.id);
      }
    });
  }

  private async initializeStorage() {
    const defaultData: StorageData = {
      documents: {},
      mappingProfiles: {},
      settings: {
        autoFillEnabled: true,
        confidenceThreshold: 0.8,
        cloudProvidersEnabled: false
      }
    };

    const result = await chrome.storage.local.get(Object.keys(defaultData));
    
    // Initialize missing keys
    const updates: Partial<StorageData> = {};
    for (const [key, defaultValue] of Object.entries(defaultData)) {
      if (!(key in result)) {
        updates[key as keyof StorageData] = defaultValue;
      }
    }

    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
    }
  }

  private async handlePDFUpload(fileData: string, filename: string): Promise<any> {
    try {
      // Convert base64 to blob
      const response = await fetch(`data:application/pdf;base64,${fileData}`);
      const blob = await response.blob();
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', blob, filename);
      
      // Upload to backend
      const uploadResponse = await fetch(`${this.API_BASE}/parse`, {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }
      
      const parseResult: ParseResult = await uploadResponse.json();
      
      // Store document info
      const documentId = `doc_${Date.now()}`;
      const document: StoredDocument = {
        id: documentId,
        filename,
        uploadedAt: new Date().toISOString(),
        parseResult
      };
      
      const storage = await chrome.storage.local.get('documents');
      const documents = storage.documents || {};
      documents[documentId] = document;
      
      await chrome.storage.local.set({ documents });
      
      return { success: true, documentId, parseResult };
      
    } catch (error) {
      console.error('FormPilot: PDF upload error:', error);
      throw error;
    }
  }

  private async getFieldValue(canonical: string, tabId?: number): Promise<any> {
    // Get the most recent document's field value
    const storage = await chrome.storage.local.get('documents');
    const documents = storage.documents || {};
    
    // Find the most recently uploaded document
    const sortedDocs = Object.values(documents)
      .sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    
    if (sortedDocs.length === 0) {
      return { value: null };
    }
    
    const latestDoc = sortedDocs[0] as StoredDocument;
    if (!latestDoc.parseResult) {
      return { value: null };
    }
    
    // Find field with matching canonical name
    const field = latestDoc.parseResult.fields.find(f => f.canonical === canonical);
    const value = field?.chosen?.value || field?.candidates[0]?.value || null;
    
    return { value };
  }

  private async getMappingProfile(host: string, path?: string): Promise<any> {
    const storage = await chrome.storage.local.get('mappingProfiles');
    const profiles = storage.mappingProfiles || {};
    
    // Try exact host+path match first
    const fullKey = path ? `${host}${path}` : host;
    if (profiles[fullKey]) {
      return { profile: profiles[fullKey] };
    }
    
    // Try host-only match
    if (profiles[host]) {
      return { profile: profiles[host] };
    }
    
    return { profile: null };
  }

  private async saveMappingProfile(profile: MappingProfile): Promise<any> {
    const storage = await chrome.storage.local.get('mappingProfiles');
    const profiles = storage.mappingProfiles || {};
    
    const key = profile.path ? `${new URL(profile.site).host}${profile.path}` : new URL(profile.site).host;
    profiles[key] = profile;
    
    await chrome.storage.local.set({ mappingProfiles: profiles });
    return { success: true };
  }

  private async getStoredDocuments(): Promise<any> {
    const storage = await chrome.storage.local.get('documents');
    const documents = Object.values(storage.documents || {});
    return { documents };
  }

  private async logFillResults(results: any[], tab?: chrome.tabs.Tab) {
    // Log fill results for analytics and debugging
    const logEntry = {
      timestamp: new Date().toISOString(),
      url: tab?.url,
      title: tab?.title,
      results,
      userAgent: navigator.userAgent
    };
    
    console.log('FormPilot: Fill results:', logEntry);
    
    // Store in local storage for debugging (optional)
    const storage = await chrome.storage.local.get('fillLogs');
    const logs = storage.fillLogs || [];
    logs.push(logEntry);
    
    // Keep only last 100 entries
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    await chrome.storage.local.set({ fillLogs: logs });
  }

  private async openSidebar(tabId?: number) {
    if (tabId) {
      try {
        await chrome.sidePanel.open({ tabId });
      } catch (error) {
        console.error('FormPilot: Error opening sidebar:', error);
      }
    }
  }
}

// Initialize background service
new BackgroundService();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('FormPilot installed successfully');
  } else if (details.reason === 'update') {
    console.log('FormPilot updated to version', chrome.runtime.getManifest().version);
  }
});