/**
 * FormPilot Content Script
 * Handles DOM scanning, form filling, and badge overlays
 */

import { FormInput, FillResult, Field } from '@shared/types';
import { DOMScanner } from './scanner';
import { FormFiller } from './filler';
import { BadgeOverlay } from './overlay';
import { MessageHandler } from './messages';

class FormPilotContent {
  private scanner: DOMScanner;
  private filler: FormFiller;
  private overlay: BadgeOverlay;
  private messageHandler: MessageHandler;
  private currentInputs: FormInput[] = [];
  private fillResults: FillResult[] = [];

  constructor() {
    this.scanner = new DOMScanner();
    this.filler = new FormFiller();
    this.overlay = new BadgeOverlay();
    this.messageHandler = new MessageHandler(this);
    
    this.initialize();
  }

  private initialize() {
    // Set up message listener
    this.messageHandler.listen();
    
    // Scan page on load
    this.scanPage();
    
    // Re-scan on DOM changes
    this.observeDOM();
    
    console.log('FormPilot content script initialized');
  }

  public async scanPage(): Promise<FormInput[]> {
    console.log('Scanning page for form inputs...');
    this.currentInputs = this.scanner.scan();
    
    // Send scan results to background/sidebar
    chrome.runtime.sendMessage({
      type: 'PAGE_SCANNED',
      payload: {
        inputs: this.currentInputs,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    });
    
    return this.currentInputs;
  }

  public async fillFields(
    fields: Field[],
    mapping: Record<string, string>,
    autoFillThreshold: number = 0.92
  ): Promise<FillResult[]> {
    console.log('Filling form fields...', { fields, mapping });
    
    // Clear previous overlays
    this.overlay.clearAll();
    
    // Fill fields
    this.fillResults = await this.filler.fill(
      this.currentInputs,
      fields,
      mapping,
      autoFillThreshold
    );
    
    // Add overlays for filled fields
    for (const result of this.fillResults) {
      if (result.success && result.source) {
        this.overlay.addBadge(
          result.selector,
          result.confidence,
          result.source
        );
      }
    }
    
    // Send fill results to background/sidebar
    chrome.runtime.sendMessage({
      type: 'FIELDS_FILLED',
      payload: {
        results: this.fillResults,
        timestamp: new Date().toISOString()
      }
    });
    
    return this.fillResults;
  }

  public highlightInput(selector: string) {
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('formpilot-highlight');
      setTimeout(() => {
        element.classList.remove('formpilot-highlight');
      }, 2000);
    }
  }

  public getInputBySelector(selector: string): FormInput | undefined {
    return this.currentInputs.find(input => input.selector === selector);
  }

  public updateMapping(fieldName: string, selector: string) {
    // Send mapping update to background
    chrome.runtime.sendMessage({
      type: 'UPDATE_MAPPING',
      payload: {
        field: fieldName,
        selector: selector,
        url: window.location.href
      }
    });
  }

  private observeDOM() {
    const observer = new MutationObserver((mutations) => {
      // Check if form elements were added
      const hasFormChanges = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            return element.matches('form, input, select, textarea') ||
                   element.querySelector('form, input, select, textarea');
          }
          return false;
        });
      });
      
      if (hasFormChanges) {
        // Debounce re-scan
        clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => {
          this.scanPage();
        }, 500);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  private scanTimeout?: number;
}

// Initialize content script
const formPilot = new FormPilotContent();

// Export for testing
export { FormPilotContent };