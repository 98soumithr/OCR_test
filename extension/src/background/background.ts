/**
 * FormPilot Background Script (Service Worker)
 * Handles extension lifecycle, storage, and messaging
 */

import { MappingProfile } from '@shared/Mapping';

// Extension state
let currentTabId: number | null = null;
let mappingProfiles: Map<string, MappingProfile> = new Map();

/**
 * Initialize background script
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('FormPilot extension installed');
  
  // Initialize storage
  initializeStorage();
  
  // Set up side panel
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

/**
 * Handle tab updates
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    currentTabId = tabId;
    
    // Load mapping profile for current site
    loadMappingProfile(tab.url);
  }
});

/**
 * Handle tab activation
 */
chrome.tabs.onActivated.addListener((activeInfo) => {
  currentTabId = activeInfo.tabId;
  
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url) {
      loadMappingProfile(tab.url);
    }
  });
});

/**
 * Handle messages from content scripts and sidebar
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_MAPPING_PROFILE':
      const profile = getCurrentMappingProfile();
      sendResponse({ profile });
      break;
      
    case 'SAVE_MAPPING_PROFILE':
      saveMappingProfile(message.profile);
      sendResponse({ success: true });
      break;
      
    case 'GET_STORAGE':
      getStorageData(message.keys).then(data => {
        sendResponse({ data });
      });
      return true; // Keep message channel open
      
    case 'SET_STORAGE':
      setStorageData(message.data).then(() => {
        sendResponse({ success: true });
      });
      return true; // Keep message channel open
      
    case 'EXPORT_MAPPING_PROFILES':
      exportMappingProfiles().then(data => {
        sendResponse({ data });
      });
      return true; // Keep message channel open
      
    case 'IMPORT_MAPPING_PROFILES':
      importMappingProfiles(message.data).then(() => {
        sendResponse({ success: true });
      });
      return true; // Keep message channel open
      
    case 'SCAN_PAGE':
      if (currentTabId) {
        chrome.tabs.sendMessage(currentTabId, message, (response) => {
          sendResponse(response);
        });
      }
      return true; // Keep message channel open
      
    case 'FILL_FIELDS':
      if (currentTabId) {
        chrome.tabs.sendMessage(currentTabId, message, (response) => {
          sendResponse(response);
        });
      }
      return true; // Keep message channel open
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Initialize storage with default values
 */
async function initializeStorage(): Promise<void> {
  const defaultData = {
    'formpilot_settings': {
      apiEndpoint: 'http://localhost:8000',
      useCloudProviders: false,
      confidenceThreshold: 0.8,
      autoFillEnabled: true
    },
    'formpilot_mapping_profiles': {},
    'formpilot_fill_logs': []
  };
  
  await chrome.storage.local.set(defaultData);
}

/**
 * Load mapping profile for current site
 */
function loadMappingProfile(url: string): void {
  const siteKey = getSiteKey(url);
  chrome.storage.local.get(['formpilot_mapping_profiles'], (result) => {
    const profiles = result.formpilot_mapping_profiles || {};
    const profile = profiles[siteKey];
    
    if (profile) {
      mappingProfiles.set(siteKey, profile);
    }
  });
}

/**
 * Get current mapping profile
 */
function getCurrentMappingProfile(): MappingProfile | null {
  if (!currentTabId) return null;
  
  chrome.tabs.get(currentTabId, (tab) => {
    if (tab.url) {
      const siteKey = getSiteKey(tab.url);
      return mappingProfiles.get(siteKey) || null;
    }
  });
  
  return null;
}

/**
 * Save mapping profile
 */
async function saveMappingProfile(profile: MappingProfile): Promise<void> {
  const siteKey = getSiteKey(profile.site);
  mappingProfiles.set(siteKey, profile);
  
  const result = await chrome.storage.local.get(['formpilot_mapping_profiles']);
  const profiles = result.formpilot_mapping_profiles || {};
  profiles[siteKey] = profile;
  
  await chrome.storage.local.set({ 'formpilot_mapping_profiles': profiles });
}

/**
 * Get site key from URL
 */
function getSiteKey(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Get storage data
 */
async function getStorageData(keys: string[]): Promise<any> {
  const result = await chrome.storage.local.get(keys);
  return result;
}

/**
 * Set storage data
 */
async function setStorageData(data: Record<string, any>): Promise<void> {
  await chrome.storage.local.set(data);
}

/**
 * Export mapping profiles as JSON
 */
async function exportMappingProfiles(): Promise<string> {
  const result = await chrome.storage.local.get(['formpilot_mapping_profiles']);
  const profiles = result.formpilot_mapping_profiles || {};
  
  return JSON.stringify(profiles, null, 2);
}

/**
 * Import mapping profiles from JSON
 */
async function importMappingProfiles(jsonData: string): Promise<void> {
  try {
    const profiles = JSON.parse(jsonData);
    
    // Validate profiles
    for (const [key, profile] of Object.entries(profiles)) {
      if (!isValidMappingProfile(profile)) {
        throw new Error(`Invalid profile format for ${key}`);
      }
    }
    
    await chrome.storage.local.set({ 'formpilot_mapping_profiles': profiles });
    
    // Update in-memory cache
    mappingProfiles.clear();
    for (const [key, profile] of Object.entries(profiles)) {
      mappingProfiles.set(key, profile as MappingProfile);
    }
    
  } catch (error) {
    throw new Error(`Failed to import profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate mapping profile format
 */
function isValidMappingProfile(profile: any): boolean {
  return (
    profile &&
    typeof profile === 'object' &&
    typeof profile.version === 'number' &&
    typeof profile.site === 'string' &&
    typeof profile.selectors === 'object' &&
    typeof profile.created === 'number' &&
    typeof profile.updated === 'number'
  );
}

/**
 * Log form fill operation
 */
async function logFormFill(fillData: any): Promise<void> {
  const logEntry = {
    timestamp: Date.now(),
    url: currentTabId ? await getCurrentTabUrl() : null,
    ...fillData
  };
  
  const result = await chrome.storage.local.get(['formpilot_fill_logs']);
  const logs = result.formpilot_fill_logs || [];
  logs.push(logEntry);
  
  // Keep only last 1000 entries
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000);
  }
  
  await chrome.storage.local.set({ 'formpilot_fill_logs': logs });
}

/**
 * Get current tab URL
 */
async function getCurrentTabUrl(): Promise<string | null> {
  if (!currentTabId) return null;
  
  try {
    const tab = await chrome.tabs.get(currentTabId);
    return tab.url || null;
  } catch {
    return null;
  }
}

/**
 * Handle extension icon click
 */
chrome.action.onClicked.addListener((tab) => {
  // Open side panel
  chrome.sidePanel.open({ tabId: tab.id });
});

// Export functions for testing
if (typeof globalThis !== 'undefined') {
  (globalThis as any).FormPilotBackground = {
    getCurrentMappingProfile,
    saveMappingProfile,
    exportMappingProfiles,
    importMappingProfiles,
    logFormFill
  };
}