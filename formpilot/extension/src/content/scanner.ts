/**
 * DOM Scanner - Scans page for form inputs and extracts metadata
 */

import { FormInput } from '@shared/types';

export class DOMScanner {
  /**
   * Scan the page for all form inputs
   */
  public scan(): FormInput[] {
    const inputs: FormInput[] = [];
    
    // Select all form elements
    const elements = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), ' +
      'select, textarea'
    );
    
    elements.forEach((element, index) => {
      const input = this.extractInputData(element as HTMLElement, index);
      if (input) {
        inputs.push(input);
      }
    });
    
    return inputs;
  }
  
  /**
   * Extract data from a single input element
   */
  private extractInputData(element: HTMLElement, index: number): FormInput | null {
    // Skip if element is not visible
    if (!this.isVisible(element)) {
      return null;
    }
    
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type') || tagName;
    
    // Generate unique selector
    const selector = this.generateSelector(element);
    const xpath = this.generateXPath(element);
    
    // Extract label
    const label = this.extractLabel(element);
    
    // Extract other metadata
    const name = element.getAttribute('name') || undefined;
    const id = element.getAttribute('id') || undefined;
    const placeholder = element.getAttribute('placeholder') || undefined;
    const ariaLabel = element.getAttribute('aria-label') || undefined;
    const required = element.hasAttribute('required');
    const value = (element as HTMLInputElement).value || undefined;
    
    // Extract options for select elements
    let options: string[] | undefined;
    if (tagName === 'select') {
      const selectElement = element as HTMLSelectElement;
      options = Array.from(selectElement.options).map(opt => opt.text);
    }
    
    return {
      selector,
      xpath,
      label,
      type,
      name,
      id,
      placeholder,
      ariaLabel,
      required,
      value,
      options
    };
  }
  
  /**
   * Generate a unique CSS selector for an element
   */
  private generateSelector(element: HTMLElement): string {
    // Try ID first
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }
    
    // Try unique attributes
    const uniqueAttrs = ['name', 'data-testid', 'data-qa', 'data-cy'];
    for (const attr of uniqueAttrs) {
      const value = element.getAttribute(attr);
      if (value) {
        const selector = `${element.tagName.toLowerCase()}[${attr}="${CSS.escape(value)}"]`;
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }
    
    // Build a path selector
    const path: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector = `#${CSS.escape(current.id)}`;
        path.unshift(selector);
        break;
      } else if (current.className) {
        const classes = Array.from(current.classList)
          .filter(c => !c.startsWith('formpilot-'))
          .map(c => `.${CSS.escape(c)}`)
          .join('');
        if (classes) {
          selector += classes;
        }
      }
      
      // Add nth-child if needed
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(current);
        if (siblings.filter(s => s.tagName === current!.tagName).length > 1) {
          selector += `:nth-child(${index + 1})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }
  
  /**
   * Generate XPath for an element
   */
  private generateXPath(element: HTMLElement): string {
    const paths: string[] = [];
    let current: Node | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const el = current as HTMLElement;
      let index = 0;
      let sibling = el.previousSibling;
      
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && 
            (sibling as HTMLElement).tagName === el.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      
      const tagName = el.tagName.toLowerCase();
      const pathIndex = index > 0 ? `[${index + 1}]` : '';
      paths.unshift(`${tagName}${pathIndex}`);
      
      current = el.parentNode;
    }
    
    return '/' + paths.join('/');
  }
  
  /**
   * Extract label for an input element
   */
  private extractLabel(element: HTMLElement): string {
    // Check for associated label via 'for' attribute
    if (element.id) {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (label) {
        return this.getTextContent(label);
      }
    }
    
    // Check for parent label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      return this.getTextContent(parentLabel, element);
    }
    
    // Check for aria-labelledby
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) {
        return this.getTextContent(labelElement);
      }
    }
    
    // Check for nearby text
    const nearbyText = this.findNearbyText(element);
    if (nearbyText) {
      return nearbyText;
    }
    
    // Fallback to placeholder or name
    return element.getAttribute('placeholder') || 
           element.getAttribute('name') || 
           element.getAttribute('aria-label') || 
           '';
  }
  
  /**
   * Find text near an element (preceding text node or element)
   */
  private findNearbyText(element: HTMLElement): string {
    // Check previous sibling
    let sibling = element.previousSibling;
    while (sibling) {
      if (sibling.nodeType === Node.TEXT_NODE) {
        const text = sibling.textContent?.trim();
        if (text && text.length > 1) {
          return text;
        }
      } else if (sibling.nodeType === Node.ELEMENT_NODE) {
        const el = sibling as HTMLElement;
        if (!el.matches('input, select, textarea, button')) {
          const text = this.getTextContent(el);
          if (text) {
            return text;
          }
        }
      }
      sibling = sibling.previousSibling;
    }
    
    // Check parent's previous sibling (for table cells, etc.)
    const parent = element.parentElement;
    if (parent && parent.tagName === 'TD') {
      const prevCell = parent.previousElementSibling;
      if (prevCell) {
        return this.getTextContent(prevCell);
      }
    }
    
    return '';
  }
  
  /**
   * Get text content from an element, excluding certain child elements
   */
  private getTextContent(element: Element, exclude?: Element): string {
    const clone = element.cloneNode(true) as Element;
    
    // Remove excluded element from clone
    if (exclude) {
      const excludeSelector = this.generateSelector(exclude as HTMLElement);
      const excludeInClone = clone.querySelector(excludeSelector);
      excludeInClone?.remove();
    }
    
    // Remove script and style elements
    clone.querySelectorAll('script, style').forEach(el => el.remove());
    
    return clone.textContent?.trim() || '';
  }
  
  /**
   * Check if an element is visible
   */
  private isVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }
}