/**
 * FormPilot Background Service Worker
 * Handles extension lifecycle, messaging, and data persistence
 */

import { ExtensionMessage, MappingProfile, ExtractedData } from '@shared/types';
import { StorageManager } from './storage';
import { APIClient } from './api';

class BackgroundService {
  private storage: StorageManager;
  private api: APIClient;
  private currentTabId: number | null = null;
  private extractedData: ExtractedData | null = null;

  constructor() {
    this.storage = new StorageManager();
    this.api = new APIClient();
    this.initialize();
  }

  private initialize() {
    // Handle extension icon click
    chrome.action.onClicked.addListener((tab) => {
      if (tab.id) {
        this.openSidePanel(tab.id);
      }
    });

    // Handle messages from content scripts and sidebar
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep channel open for async response
    });

    // Handle tab updates
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.currentTabId = activeInfo.tabId;
      this.notifySidebar('TAB_CHANGED', { tabId: activeInfo.tabId });
    });

    // Handle tab URL changes
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.url && tabId === this.currentTabId) {
        this.notifySidebar('URL_CHANGED', { url: changeInfo.url });
      }
    });

    console.log('FormPilot background service initialized');
  }

  private async handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ) {
    try {
      switch (message.type) {
        case 'EXTRACT_PDF':
          await this.handlePDFExtraction(message.payload, sendResponse);
          break;

        case 'GET_MAPPING':
          await this.handleGetMapping(message.payload, sendResponse);
          break;

        case 'SAVE_MAPPING':
          await this.handleSaveMapping(message.payload, sendResponse);
          break;

        case 'PAGE_SCANNED':
          await this.handlePageScanned(message.payload, sender);
          sendResponse({ success: true });
          break;

        case 'FIELDS_FILLED':
          await this.handleFieldsFilled(message.payload);
          sendResponse({ success: true });
          break;

        case 'UPDATE_MAPPING':
          await this.handleUpdateMapping(message.payload);
          sendResponse({ success: true });
          break;

        case 'GET_EXTRACTED_DATA':
          sendResponse({ success: true, data: this.extractedData });
          break;

        case 'SCAN_CURRENT_TAB':
          await this.scanCurrentTab(sendResponse);
          break;

        case 'FILL_CURRENT_TAB':
          await this.fillCurrentTab(message.payload, sendResponse);
          break;

        default:
          sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
      }
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handlePDFExtraction(payload: any, sendResponse: (response: any) => void) {
    try {
      const { file, useCloud, cloudProvider } = payload;
      
      // Upload and extract PDF
      const extractedData = await this.api.extractPDF(file, useCloud, cloudProvider);
      this.extractedData = extractedData;
      
      // Notify sidebar
      this.notifySidebar('PDF_EXTRACTED', extractedData);
      
      sendResponse({ success: true, data: extractedData });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract PDF'
      });
    }
  }

  private async handleGetMapping(payload: any, sendResponse: (response: any) => void) {
    try {
      const { url } = payload;
      const mapping = await this.storage.getMapping(url);
      sendResponse({ success: true, data: mapping });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get mapping'
      });
    }
  }

  private async handleSaveMapping(payload: any, sendResponse: (response: any) => void) {
    try {
      const { url, mapping } = payload;
      await this.storage.saveMapping(url, mapping);
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save mapping'
      });
    }
  }

  private async handlePageScanned(payload: any, sender: chrome.runtime.MessageSender) {
    // Store scanned inputs
    if (sender.tab?.id) {
      await this.storage.setTabData(sender.tab.id, 'scannedInputs', payload.inputs);
    }
    
    // Notify sidebar
    this.notifySidebar('PAGE_SCANNED', payload);
  }

  private async handleFieldsFilled(payload: any) {
    // Log fill results
    await this.storage.logFillResult(payload.results);
    
    // Notify sidebar
    this.notifySidebar('FIELDS_FILLED', payload);
  }

  private async handleUpdateMapping(payload: any) {
    const { field, selector, url } = payload;
    
    // Get or create mapping for this URL
    let mapping = await this.storage.getMapping(url);
    if (!mapping) {
      mapping = {
        version: 1,
        site: url,
        selectors: {},
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Update selector
    if (!mapping.selectors[field]) {
      mapping.selectors[field] = [];
    }
    if (!mapping.selectors[field].includes(selector)) {
      mapping.selectors[field].push(selector);
    }
    
    // Save updated mapping
    await this.storage.saveMapping(url, mapping);
    
    // Notify sidebar
    this.notifySidebar('MAPPING_UPDATED', { field, selector, url });
  }

  private async scanCurrentTab(sendResponse: (response: any) => void) {
    if (!this.currentTabId) {
      sendResponse({ success: false, error: 'No active tab' });
      return;
    }
    
    try {
      // Send message to content script
      const response = await chrome.tabs.sendMessage(this.currentTabId, {
        type: 'SCAN_PAGE'
      });
      
      sendResponse(response);
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scan page'
      });
    }
  }

  private async fillCurrentTab(payload: any, sendResponse: (response: any) => void) {
    if (!this.currentTabId) {
      sendResponse({ success: false, error: 'No active tab' });
      return;
    }
    
    try {
      // Send message to content script
      const response = await chrome.tabs.sendMessage(this.currentTabId, {
        type: 'FILL_FIELDS',
        payload
      });
      
      sendResponse(response);
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fill fields'
      });
    }
  }

  private async openSidePanel(tabId: number) {
    // Open side panel (Chrome 114+)
    if (chrome.sidePanel) {
      await chrome.sidePanel.open({ tabId });
    } else {
      // Fallback: open in popup
      chrome.action.openPopup();
    }
  }

  private notifySidebar(type: string, payload: any) {
    // Send message to sidebar
    chrome.runtime.sendMessage({
      type: `SIDEBAR_${type}`,
      payload
    }).catch(() => {
      // Sidebar might not be open, ignore error
    });
  }
}

// Initialize background service
new BackgroundService();