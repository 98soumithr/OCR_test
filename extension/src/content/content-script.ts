/**
 * FormPilot Content Script
 * Handles DOM scanning, form detection, autofill, and badge overlays
 */

import { DOMInput, FillMapping } from '@shared/types';
import { FORM_SELECTORS } from '@shared/constants';

interface FormPilotAPI {
  scanPage(): DOMInput[];
  fillFields(mappings: FillMapping[]): Promise<void>;
  overlayBadges(mappings: FillMapping[]): void;
  clearBadges(): void;
  highlightInput(selector: string): void;
  unhighlightAll(): void;
}

class ContentScript {
  private badges: Map<string, HTMLElement> = new Map();
  private observers: MutationObserver[] = [];
  
  constructor() {
    this.setupMessageListener();
    this.setupAPI();
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'SCAN_PAGE':
          sendResponse(this.scanPage());
          break;
        case 'FILL_FIELDS':
          this.fillFields(message.mappings).then(() => {
            sendResponse({ success: true });
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true; // Async response
        case 'OVERLAY_BADGES':
          this.overlayBadges(message.mappings);
          sendResponse({ success: true });
          break;
        case 'CLEAR_BADGES':
          this.clearBadges();
          sendResponse({ success: true });
          break;
        case 'HIGHLIGHT_INPUT':
          this.highlightInput(message.selector);
          sendResponse({ success: true });
          break;
        case 'UNHIGHLIGHT_ALL':
          this.unhighlightAll();
          sendResponse({ success: true });
          break;
      }
    });
  }

  private setupAPI() {
    // Expose API to the page context for debugging
    (window as any).FormPilot = {
      scanPage: () => this.scanPage(),
      fillFields: (mappings: FillMapping[]) => this.fillFields(mappings),
      overlayBadges: (mappings: FillMapping[]) => this.overlayBadges(mappings),
      clearBadges: () => this.clearBadges(),
      highlightInput: (selector: string) => this.highlightInput(selector),
      unhighlightAll: () => this.unhighlightAll()
    } as FormPilotAPI;
  }

  /**
   * Scan the current page for form inputs and collect metadata
   */
  public scanPage(): DOMInput[] {
    const inputs: DOMInput[] = [];
    
    // Find all form inputs
    const elements = document.querySelectorAll(FORM_SELECTORS.join(', '));
    
    elements.forEach((element, index) => {
      const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      
      // Skip hidden or disabled inputs
      if (input.type === 'hidden' || input.disabled || !this.isVisible(input)) {
        return;
      }
      
      const domInput = this.extractInputMetadata(input, index);
      if (domInput) {
        inputs.push(domInput);
      }
    });
    
    console.log(`FormPilot: Found ${inputs.length} form inputs`);
    return inputs;
  }

  /**
   * Fill form fields based on provided mappings
   */
  public async fillFields(mappings: FillMapping[]): Promise<void> {
    const results = [];
    
    for (const mapping of mappings) {
      try {
        const element = document.querySelector(mapping.domSelector) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        
        if (!element) {
          console.warn(`FormPilot: Element not found for selector: ${mapping.domSelector}`);
          continue;
        }
        
        const success = await this.fillSingleField(element, mapping);
        results.push({ selector: mapping.domSelector, success });
        
      } catch (error) {
        console.error(`FormPilot: Error filling field ${mapping.domSelector}:`, error);
        results.push({ selector: mapping.domSelector, success: false, error: error.message });
      }
    }
    
    // Notify background script of fill results
    chrome.runtime.sendMessage({
      type: 'FILL_COMPLETE',
      results
    });
  }

  /**
   * Add visual badges to filled inputs
   */
  public overlayBadges(mappings: FillMapping[]): void {
    this.clearBadges();
    
    mappings.forEach(mapping => {
      const element = document.querySelector(mapping.domSelector) as HTMLElement;
      if (element) {
        this.addBadge(element, mapping);
      }
    });
  }

  /**
   * Clear all badges
   */
  public clearBadges(): void {
    this.badges.forEach(badge => badge.remove());
    this.badges.clear();
  }

  /**
   * Highlight a specific input
   */
  public highlightInput(selector: string): void {
    this.unhighlightAll();
    
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.style.outline = '2px solid #3b82f6';
      element.style.outlineOffset = '2px';
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Remove all highlights
   */
  public unhighlightAll(): void {
    const highlighted = document.querySelectorAll('[style*="outline"]');
    highlighted.forEach(element => {
      (element as HTMLElement).style.outline = '';
      (element as HTMLElement).style.outlineOffset = '';
    });
  }

  private extractInputMetadata(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, index: number): DOMInput | null {
    try {
      // Get input type
      const type = this.getInputType(element);
      
      // Get associated label
      const label = this.getAssociatedLabel(element);
      
      // Generate CSS selector
      const selector = this.generateSelector(element, index);
      
      // Generate XPath
      const xpath = this.generateXPath(element);
      
      return {
        selector,
        type,
        label,
        placeholder: element.getAttribute('placeholder') || undefined,
        name: element.getAttribute('name') || undefined,
        id: element.id || undefined,
        ariaLabel: element.getAttribute('aria-label') || undefined,
        xpath,
        associatedText: this.getAssociatedText(element)
      };
      
    } catch (error) {
      console.error('FormPilot: Error extracting input metadata:', error);
      return null;
    }
  }

  private getInputType(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): DOMInput['type'] {
    if (element.tagName.toLowerCase() === 'select') return 'select';
    if (element.tagName.toLowerCase() === 'textarea') return 'textarea';
    
    const input = element as HTMLInputElement;
    switch (input.type) {
      case 'email': return 'email';
      case 'tel': return 'tel';
      case 'number': return 'number';
      case 'date': return 'date';
      case 'checkbox': return 'checkbox';
      case 'radio': return 'radio';
      default: return 'text';
    }
  }

  private getAssociatedLabel(element: HTMLElement): string {
    // Try to find label by 'for' attribute
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) {
        return label.textContent?.trim() || '';
      }
    }
    
    // Try to find parent label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      return parentLabel.textContent?.trim() || '';
    }
    
    // Try to find nearby text (previous sibling, parent text, etc.)
    const nearbyText = this.getNearbyText(element);
    return nearbyText;
  }

  private getNearbyText(element: HTMLElement): string {
    // Check previous sibling text nodes
    let sibling = element.previousSibling;
    while (sibling) {
      if (sibling.nodeType === Node.TEXT_NODE) {
        const text = sibling.textContent?.trim();
        if (text && text.length > 2) {
          return text;
        }
      } else if (sibling.nodeType === Node.ELEMENT_NODE) {
        const text = (sibling as HTMLElement).textContent?.trim();
        if (text && text.length > 2 && text.length < 100) {
          return text;
        }
      }
      sibling = sibling.previousSibling;
    }
    
    // Check parent element text
    const parent = element.parentElement;
    if (parent) {
      const parentText = parent.textContent?.trim() || '';
      const elementText = element.textContent?.trim() || '';
      const label = parentText.replace(elementText, '').trim();
      if (label && label.length > 2 && label.length < 100) {
        return label;
      }
    }
    
    return element.getAttribute('name') || element.id || 'Unlabeled field';
  }

  private getAssociatedText(element: HTMLElement): string | undefined {
    // Get text from table cell context
    const cell = element.closest('td, th');
    if (cell) {
      const row = cell.closest('tr');
      if (row) {
        const headerCell = row.querySelector('th');
        if (headerCell) {
          return headerCell.textContent?.trim();
        }
      }
    }
    
    // Get text from fieldset legend
    const fieldset = element.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend) {
        return legend.textContent?.trim();
      }
    }
    
    return undefined;
  }

  private generateSelector(element: HTMLElement, index: number): string {
    // Try ID first
    if (element.id) {
      return `#${element.id}`;
    }
    
    // Try name attribute
    if (element.getAttribute('name')) {
      const name = element.getAttribute('name');
      return `[name="${name}"]`;
    }
    
    // Try unique class combination
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        const classSelector = '.' + classes.join('.');
        if (document.querySelectorAll(classSelector).length === 1) {
          return classSelector;
        }
      }
    }
    
    // Fall back to nth-of-type
    const tagName = element.tagName.toLowerCase();
    const siblings = Array.from(element.parentElement?.children || [])
      .filter(el => el.tagName.toLowerCase() === tagName);
    const nthIndex = siblings.indexOf(element) + 1;
    
    return `${tagName}:nth-of-type(${nthIndex})`;
  }

  private generateXPath(element: HTMLElement): string {
    const segments = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let segment = current.tagName.toLowerCase();
      
      if (current.id) {
        segment += `[@id='${current.id}']`;
        segments.unshift(segment);
        break;
      } else {
        const siblings = Array.from(current.parentElement?.children || [])
          .filter(el => el.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          segment += `[${index}]`;
        }
        segments.unshift(segment);
      }
      
      current = current.parentElement!;
    }
    
    return '//' + segments.join('/');
  }

  private async fillSingleField(
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, 
    mapping: FillMapping
  ): Promise<boolean> {
    try {
      // Get the field value from the mapping (this would come from the parsed PDF)
      // For now, we'll simulate getting the value
      const value = await this.getFieldValue(mapping.fieldCanonical);
      
      if (!value) {
        return false;
      }
      
      // Fill based on element type
      if (element.tagName.toLowerCase() === 'select') {
        return this.fillSelectElement(element as HTMLSelectElement, value);
      } else if ((element as HTMLInputElement).type === 'checkbox') {
        return this.fillCheckboxElement(element as HTMLInputElement, value);
      } else if ((element as HTMLInputElement).type === 'radio') {
        return this.fillRadioElement(element as HTMLInputElement, value);
      } else {
        return this.fillTextElement(element as HTMLInputElement | HTMLTextAreaElement, value);
      }
      
    } catch (error) {
      console.error('FormPilot: Error filling field:', error);
      return false;
    }
  }

  private async getFieldValue(canonical: string): Promise<string | null> {
    // This would normally get the value from the parsed PDF data
    // For now, return a placeholder
    return new Promise(resolve => {
      chrome.runtime.sendMessage({
        type: 'GET_FIELD_VALUE',
        canonical
      }, response => {
        resolve(response?.value || null);
      });
    });
  }

  private fillTextElement(element: HTMLInputElement | HTMLTextAreaElement, value: string): boolean {
    // Focus the element
    element.focus();
    
    // Clear existing value
    element.value = '';
    
    // Set new value
    element.value = value;
    
    // Trigger events to ensure the form framework detects the change
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    return true;
  }

  private fillSelectElement(element: HTMLSelectElement, value: string): boolean {
    // Try to find matching option by value or text
    const options = Array.from(element.options);
    
    // First try exact value match
    let option = options.find(opt => opt.value === value);
    
    // Then try text content match
    if (!option) {
      option = options.find(opt => opt.textContent?.trim().toLowerCase() === value.toLowerCase());
    }
    
    // Finally try partial match
    if (!option) {
      option = options.find(opt => 
        opt.textContent?.trim().toLowerCase().includes(value.toLowerCase()) ||
        value.toLowerCase().includes(opt.textContent?.trim().toLowerCase() || '')
      );
    }
    
    if (option) {
      element.value = option.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    
    return false;
  }

  private fillCheckboxElement(element: HTMLInputElement, value: string): boolean {
    const shouldCheck = ['true', 'yes', '1', 'on', 'checked', '✓', '☑'].includes(value.toLowerCase());
    element.checked = shouldCheck;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  private fillRadioElement(element: HTMLInputElement, value: string): boolean {
    // For radio buttons, check if this specific radio's value matches
    if (element.value === value || element.value.toLowerCase() === value.toLowerCase()) {
      element.checked = true;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  private addBadge(element: HTMLElement, mapping: FillMapping): void {
    const badge = document.createElement('div');
    badge.className = 'formpilot-badge';
    badge.innerHTML = '✓';
    
    // Style the badge
    Object.assign(badge.style, {
      position: 'absolute',
      top: '-8px',
      right: '-8px',
      width: '20px',
      height: '20px',
      backgroundColor: '#22c55e',
      color: 'white',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 'bold',
      zIndex: '10000',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      fontFamily: 'system-ui, sans-serif'
    });
    
    // Position relative to the input
    const rect = element.getBoundingClientRect();
    const parent = element.offsetParent || document.body;
    const parentRect = parent.getBoundingClientRect();
    
    badge.style.left = `${rect.right - parentRect.left - 8}px`;
    badge.style.top = `${rect.top - parentRect.top - 8}px`;
    
    // Add tooltip on hover
    badge.title = `Filled from PDF: ${mapping.fieldCanonical} (${Math.round(mapping.confidence * 100)}% confidence)`;
    
    // Add click handler to show provenance
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showProvenance(mapping, element);
    });
    
    // Append to parent
    parent.appendChild(badge);
    this.badges.set(mapping.domSelector, badge);
  }

  private showProvenance(mapping: FillMapping, element: HTMLElement): void {
    // Create provenance popup
    const popup = document.createElement('div');
    popup.className = 'formpilot-provenance';
    
    popup.innerHTML = `
      <div style="
        position: absolute;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        max-width: 300px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
      ">
        <div style="font-weight: bold; margin-bottom: 8px;">
          Field: ${mapping.fieldCanonical}
        </div>
        <div style="margin-bottom: 4px;">
          Confidence: ${Math.round(mapping.confidence * 100)}%
        </div>
        <div style="margin-bottom: 4px;">
          Method: ${mapping.method.replace('_', ' ')}
        </div>
        <div style="font-size: 12px; color: #666;">
          Click outside to close
        </div>
      </div>
    `;
    
    // Position near the element
    const rect = element.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.left = `${rect.right + 10}px`;
    popup.style.top = `${rect.top}px`;
    popup.style.zIndex = '10001';
    
    // Add to document
    document.body.appendChild(popup);
    
    // Remove on click outside
    const removePopup = (e: Event) => {
      if (!popup.contains(e.target as Node)) {
        popup.remove();
        document.removeEventListener('click', removePopup);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', removePopup);
    }, 100);
  }

  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  // Methods are already bound in constructor
}

// Initialize content script
const contentScript = new ContentScript();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentScript;
}