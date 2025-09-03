/**
 * FormPilot Content Script
 * Handles DOM scanning, form field detection, and form filling
 */

import { FormField, FieldMatch, FillResult, MappingProfile } from '@shared/Mapping';
import { Field, Candidate } from '@shared/Field';

// Global state
let formFields: FormField[] = [];
let currentMapping: MappingProfile | null = null;
let filledFields: Map<string, FillResult> = new Map();

/**
 * Initialize content script
 */
function init() {
  console.log('FormPilot content script loaded');
  
  // Scan page for form fields
  scanPage();
  
  // Listen for messages from sidebar
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Watch for dynamic form changes
  observeFormChanges();
}

/**
 * Scan the current page for form fields
 */
function scanPage(): FormField[] {
  formFields = [];
  
  // Find all form input elements
  const inputs = document.querySelectorAll('input, select, textarea');
  
  inputs.forEach((element, index) => {
    const formField = extractFormField(element as HTMLElement, index);
    if (formField) {
      formFields.push(formField);
    }
  });
  
  console.log(`Found ${formFields.length} form fields`);
  return formFields;
}

/**
 * Extract form field information from DOM element
 */
function extractFormField(element: HTMLElement, index: number): FormField | null {
  const tagName = element.tagName.toLowerCase();
  
  if (!['input', 'select', 'textarea'].includes(tagName)) {
    return null;
  }
  
  // Get element properties
  const name = (element as HTMLInputElement).name || '';
  const id = element.id || '';
  const className = element.className || '';
  const placeholder = (element as HTMLInputElement).placeholder || '';
  const ariaLabel = element.getAttribute('aria-label') || '';
  const inputType = (element as HTMLInputElement).type || 'text';
  const required = element.hasAttribute('required');
  const disabled = (element as HTMLInputElement).disabled;
  const value = (element as HTMLInputElement).value || '';
  
  // Get associated label
  const label = getAssociatedLabel(element);
  
  // Generate selectors
  const selector = generateCSSSelector(element);
  const xpath = generateXPath(element);
  
  // Get bounding rectangle
  const rect = element.getBoundingClientRect();
  
  return {
    type: tagName,
    selector,
    xpath,
    name,
    id,
    className,
    placeholder,
    label,
    ariaLabel,
    inputType,
    required,
    disabled,
    value,
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left
    }
  };
}

/**
 * Get associated label for form element
 */
function getAssociatedLabel(element: HTMLElement): string {
  // Check for explicit label association
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent?.trim() || '';
    }
  }
  
  // Check for parent label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    return parentLabel.textContent?.trim() || '';
  }
  
  // Check for nearby text (within same container)
  const container = element.closest('div, fieldset, form, section');
  if (container) {
    const textNodes = Array.from(container.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent?.trim())
      .filter(text => text && text.length > 0);
    
    if (textNodes.length > 0) {
      return textNodes[0];
    }
  }
  
  // Check for table header (if in table)
  const tableCell = element.closest('td');
  if (tableCell) {
    const row = tableCell.closest('tr');
    if (row) {
      const headerRow = row.previousElementSibling;
      if (headerRow) {
        const cellIndex = Array.from(row.children).indexOf(tableCell);
        const headerCell = headerRow.children[cellIndex];
        if (headerCell) {
          return headerCell.textContent?.trim() || '';
        }
      }
    }
  }
  
  return '';
}

/**
 * Generate CSS selector for element
 */
function generateCSSSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim());
    if (classes.length > 0) {
      return `.${classes.join('.')}`;
    }
  }
  
  // Use tag name with attributes
  let selector = element.tagName.toLowerCase();
  
  if (element.name) {
    selector += `[name="${element.name}"]`;
  }
  
  if (element.type) {
    selector += `[type="${element.type}"]`;
  }
  
  return selector;
}

/**
 * Generate XPath for element
 */
function generateXPath(element: HTMLElement): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  const path: string[] = [];
  let current: Element | null = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector += `[@id="${current.id}"]`;
      path.unshift(selector);
      break;
    } else {
      const siblings = Array.from(current.parentNode?.children || [])
        .filter(sibling => sibling.tagName === current!.tagName);
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `[${index}]`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return '/' + path.join('/');
}

/**
 * Fill form fields with extracted data
 */
async function fillFields(fields: Field[]): Promise<FillResult[]> {
  const results: FillResult[] = [];
  
  for (const field of fields) {
    if (!field.chosen) {
      continue;
    }
    
    const match = await findBestMatch(field);
    if (match && match.confidence === 'high') {
      const result = await fillField(match.domField, field.chosen);
      results.push(result);
      filledFields.set(field.canonical, result);
    }
  }
  
  // Add overlay badges
  overlayBadges();
  
  return results;
}

/**
 * Find best match between extracted field and DOM field
 */
async function findBestMatch(field: Field): Promise<FieldMatch | null> {
  let bestMatch: FieldMatch | null = null;
  let bestScore = 0;
  
  for (const domField of formFields) {
    const score = await calculateSimilarity(field.canonical, domField);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        field: field.canonical,
        domField,
        score,
        confidence: score >= 0.92 ? 'high' : score >= 0.80 ? 'medium' : 'low',
        method: 'semantic'
      };
    }
  }
  
  return bestMatch;
}

/**
 * Calculate similarity between field name and DOM field
 */
async function calculateSimilarity(fieldName: string, domField: FormField): Promise<number> {
  // Build label string from DOM field
  const labelParts = [
    domField.label,
    domField.placeholder,
    domField.ariaLabel,
    domField.name,
    domField.id
  ].filter(Boolean);
  
  const labelString = labelParts.join(' ').toLowerCase();
  
  // Simple fuzzy matching for now
  // In production, you'd use sentence-transformers here
  const similarity = calculateFuzzySimilarity(fieldName.toLowerCase(), labelString);
  
  return similarity;
}

/**
 * Simple fuzzy string similarity
 */
function calculateFuzzySimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Fill a single form field
 */
async function fillField(domField: FormField, candidate: Candidate): Promise<FillResult> {
  try {
    const element = document.querySelector(domField.selector) as HTMLInputElement;
    
    if (!element) {
      return {
        field: domField.selector,
        selector: domField.selector,
        value: candidate.value,
        success: false,
        error: 'Element not found',
        confidence: candidate.confidence,
        source: {
          page: candidate.page,
          bbox: candidate.bbox,
          text: candidate.sourceText || candidate.value
        }
      };
    }
    
    // Set the value
    element.value = candidate.value;
    
    // Trigger change events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    return {
      field: domField.selector,
      selector: domField.selector,
      value: candidate.value,
      success: true,
      confidence: candidate.confidence,
      source: {
        page: candidate.page,
        bbox: candidate.bbox,
        text: candidate.sourceText || candidate.value
      }
    };
    
  } catch (error) {
    return {
      field: domField.selector,
      selector: domField.selector,
      value: candidate.value,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      confidence: candidate.confidence,
      source: {
        page: candidate.page,
        bbox: candidate.bbox,
        text: candidate.sourceText || candidate.value
      }
    };
  }
}

/**
 * Add overlay badges to filled fields
 */
function overlayBadges(): void {
  // Remove existing badges
  document.querySelectorAll('.formpilot-badge').forEach(badge => badge.remove());
  
  filledFields.forEach((result, fieldName) => {
    if (!result.success) return;
    
    const element = document.querySelector(result.selector) as HTMLElement;
    if (!element) return;
    
    const badge = createBadge(result);
    element.style.position = 'relative';
    element.appendChild(badge);
  });
}

/**
 * Create a badge element for a filled field
 */
function createBadge(result: FillResult): HTMLElement {
  const badge = document.createElement('div');
  badge.className = 'formpilot-badge';
  badge.innerHTML = '✓';
  badge.style.cssText = `
    position: absolute;
    top: -8px;
    right: -8px;
    width: 16px;
    height: 16px;
    background: #4CAF50;
    color: white;
    border-radius: 50%;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;
  
  // Add tooltip
  badge.title = `Source: Page ${result.source.page}, Confidence: ${(result.confidence * 100).toFixed(1)}%`;
  
  // Add click handler for provenance popup
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    showProvenancePopup(result, badge);
  });
  
  return badge;
}

/**
 * Show provenance popup
 */
function showProvenancePopup(result: FillResult, badge: HTMLElement): void {
  // Remove existing popup
  document.querySelectorAll('.formpilot-popup').forEach(popup => popup.remove());
  
  const popup = document.createElement('div');
  popup.className = 'formpilot-popup';
  popup.innerHTML = `
    <div class="formpilot-popup-content">
      <h4>Field Source</h4>
      <p><strong>Value:</strong> ${result.value}</p>
      <p><strong>Page:</strong> ${result.source.page}</p>
      <p><strong>Confidence:</strong> ${(result.confidence * 100).toFixed(1)}%</p>
      <p><strong>Source Text:</strong> ${result.source.text}</p>
      <button class="formpilot-popup-close">×</button>
    </div>
  `;
  
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 400px;
  `;
  
  document.body.appendChild(popup);
  
  // Close button handler
  const closeBtn = popup.querySelector('.formpilot-popup-close');
  closeBtn?.addEventListener('click', () => popup.remove());
  
  // Close on outside click
  popup.addEventListener('click', (e) => {
    if (e.target === popup) {
      popup.remove();
    }
  });
}

/**
 * Observe form changes for dynamic content
 */
function observeFormChanges(): void {
  const observer = new MutationObserver((mutations) => {
    let shouldRescan = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.matches('input, select, textarea') || 
                element.querySelector('input, select, textarea')) {
              shouldRescan = true;
            }
          }
        });
      }
    });
    
    if (shouldRescan) {
      scanPage();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Handle messages from extension
 */
function handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  switch (message.type) {
    case 'SCAN_PAGE':
      const fields = scanPage();
      sendResponse({ fields });
      break;
      
    case 'FILL_FIELDS':
      fillFields(message.fields).then(results => {
        sendResponse({ results });
      });
      return true; // Keep message channel open for async response
      
    case 'GET_FILLED_FIELDS':
      sendResponse({ fields: Array.from(filledFields.values()) });
      break;
      
    case 'CLEAR_BADGES':
      document.querySelectorAll('.formpilot-badge, .formpilot-popup').forEach(el => el.remove());
      filledFields.clear();
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}