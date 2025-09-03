/**
 * Storage Manager - Handles IndexedDB and Chrome storage
 */

import { MappingProfile, FillResult } from '@shared/types';

export class StorageManager {
  private db: IDBDatabase | null = null;
  private dbName = 'FormPilotDB';
  private dbVersion = 1;

  constructor() {
    this.initDB();
  }

  private async initDB() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('mappings')) {
          const mappingStore = db.createObjectStore('mappings', { keyPath: 'site' });
          mappingStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }

        if (!db.objectStoreNames.contains('fillLogs')) {
          const logStore = db.createObjectStore('fillLogs', { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
          logStore.createIndex('url', 'url', { unique: false });
        }

        if (!db.objectStoreNames.contains('extractedData')) {
          db.createObjectStore('extractedData', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Get mapping profile for a URL
   */
  public async getMapping(url: string): Promise<MappingProfile | null> {
    await this.ensureDB();
    
    const siteKey = this.getSiteKey(url);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mappings'], 'readonly');
      const store = transaction.objectStore('mappings');
      const request = store.get(siteKey);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save mapping profile
   */
  public async saveMapping(url: string, mapping: MappingProfile): Promise<void> {
    await this.ensureDB();
    
    const siteKey = this.getSiteKey(url);
    mapping.site = siteKey;
    mapping.lastUpdated = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mappings'], 'readwrite');
      const store = transaction.objectStore('mappings');
      const request = store.put(mapping);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete mapping profile
   */
  public async deleteMapping(url: string): Promise<void> {
    await this.ensureDB();
    
    const siteKey = this.getSiteKey(url);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mappings'], 'readwrite');
      const store = transaction.objectStore('mappings');
      const request = store.delete(siteKey);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all mapping profiles
   */
  public async getAllMappings(): Promise<MappingProfile[]> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mappings'], 'readonly');
      const store = transaction.objectStore('mappings');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Log fill result
   */
  public async logFillResult(results: FillResult[]): Promise<void> {
    await this.ensureDB();

    const log = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      results,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['fillLogs'], 'readwrite');
      const store = transaction.objectStore('fillLogs');
      const request = store.add(log);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get fill logs
   */
  public async getFillLogs(limit: number = 100): Promise<any[]> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['fillLogs'], 'readonly');
      const store = transaction.objectStore('fillLogs');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      
      const logs: any[] = [];
      let count = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && count < limit) {
          logs.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(logs);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store extracted data temporarily
   */
  public async storeExtractedData(id: string, data: any): Promise<void> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['extractedData'], 'readwrite');
      const store = transaction.objectStore('extractedData');
      const request = store.put({ id, data, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get extracted data
   */
  public async getExtractedData(id: string): Promise<any> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['extractedData'], 'readonly');
      const store = transaction.objectStore('extractedData');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store tab-specific data in Chrome storage
   */
  public async setTabData(tabId: number, key: string, value: any): Promise<void> {
    const storageKey = `tab_${tabId}_${key}`;
    return chrome.storage.session.set({ [storageKey]: value });
  }

  /**
   * Get tab-specific data from Chrome storage
   */
  public async getTabData(tabId: number, key: string): Promise<any> {
    const storageKey = `tab_${tabId}_${key}`;
    const result = await chrome.storage.session.get(storageKey);
    return result[storageKey];
  }

  /**
   * Clear tab data
   */
  public async clearTabData(tabId: number): Promise<void> {
    const keys = await chrome.storage.session.get();
    const tabKeys = Object.keys(keys).filter(k => k.startsWith(`tab_${tabId}_`));
    return chrome.storage.session.remove(tabKeys);
  }

  /**
   * Get site key from URL (host + pathname)
   */
  private getSiteKey(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.host}${parsed.pathname}`;
    } catch {
      return url;
    }
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }
  }
}