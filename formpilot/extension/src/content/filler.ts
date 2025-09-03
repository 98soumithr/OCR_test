/**
 * Form Filler - Fills form fields with extracted data
 */

import { FormInput, Field, FillResult, Candidate } from '@shared/types';

export class FormFiller {
  /**
   * Fill form fields with extracted data
   */
  public async fill(
    inputs: FormInput[],
    fields: Field[],
    mapping: Record<string, string>,
    autoFillThreshold: number = 0.92
  ): Promise<FillResult[]> {
    const results: FillResult[] = [];
    
    // Create a map of canonical field names to field data
    const fieldMap = new Map<string, Field>();
    fields.forEach(field => {
      fieldMap.set(field.canonical, field);
    });
    
    // Try to fill each mapped field
    for (const [canonical, selector] of Object.entries(mapping)) {
      const field = fieldMap.get(canonical);
      if (!field) continue;
      
      const candidate = field.chosen || field.candidates[0];
      if (!candidate) continue;
      
      // Only auto-fill if confidence is high enough
      if (candidate.confidence < autoFillThreshold) {
        results.push({
          field: canonical,
          selector,
          success: false,
          confidence: candidate.confidence,
          source: candidate,
          error: `Confidence ${candidate.confidence} below threshold ${autoFillThreshold}`
        });
        continue;
      }
      
      // Try to fill the field
      const result = this.fillField(selector, candidate.value, canonical, candidate);
      results.push(result);
    }
    
    // Also try to auto-match unmapped fields
    const unmappedFields = fields.filter(f => !mapping[f.canonical]);
    for (const field of unmappedFields) {
      const candidate = field.chosen || field.candidates[0];
      if (!candidate || candidate.confidence < autoFillThreshold) continue;
      
      // Try to find matching input by label
      const matchedInput = this.findMatchingInput(inputs, field.canonical);
      if (matchedInput) {
        const result = this.fillField(
          matchedInput.selector,
          candidate.value,
          field.canonical,
          candidate
        );
        results.push(result);
      }
    }
    
    return results;
  }
  
  /**
   * Fill a single field
   */
  private fillField(
    selector: string,
    value: string,
    fieldName: string,
    source: Candidate
  ): FillResult {
    try {
      const element = document.querySelector(selector) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      
      if (!element) {
        return {
          field: fieldName,
          selector,
          success: false,
          confidence: source.confidence,
          source,
          error: 'Element not found'
        };
      }
      
      // Handle different input types
      const tagName = element.tagName.toLowerCase();
      const type = element.getAttribute('type') || tagName;
      
      switch (type) {
        case 'checkbox':
          // Check if value indicates checked state
          (element as HTMLInputElement).checked = 
            value.toLowerCase() === 'true' || 
            value.toLowerCase() === 'yes' || 
            value === '1';
          break;
          
        case 'radio':
          // Find radio button with matching value
          const radios = document.querySelectorAll(`input[name="${element.getAttribute('name')}"]`);
          radios.forEach(radio => {
            const radioEl = radio as HTMLInputElement;
            if (radioEl.value === value || radioEl.getAttribute('data-label') === value) {
              radioEl.checked = true;
            }
          });
          break;
          
        case 'select':
          // Try to match option by value or text
          const selectEl = element as HTMLSelectElement;
          const options = Array.from(selectEl.options);
          const matchedOption = options.find(opt => 
            opt.value === value || 
            opt.text === value ||
            opt.text.toLowerCase() === value.toLowerCase()
          );
          if (matchedOption) {
            selectEl.value = matchedOption.value;
          } else {
            selectEl.value = value;
          }
          break;
          
        default:
          // Text input, textarea, etc.
          element.value = value;
          break;
      }
      
      // Trigger input events to notify frameworks
      this.triggerInputEvents(element);
      
      // Add filled attribute for styling
      element.setAttribute('data-formpilot-filled', 'true');
      element.setAttribute('data-formpilot-field', fieldName);
      element.setAttribute('data-formpilot-confidence', source.confidence.toString());
      
      return {
        field: fieldName,
        selector,
        success: true,
        confidence: source.confidence,
        source
      };
      
    } catch (error) {
      return {
        field: fieldName,
        selector,
        success: false,
        confidence: source.confidence,
        source,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Find matching input by field name
   */
  private findMatchingInput(inputs: FormInput[], fieldName: string): FormInput | undefined {
    // Normalize field name for matching
    const normalized = fieldName.toLowerCase().replace(/_/g, ' ');
    
    // Try exact match first
    let matched = inputs.find(input => {
      const label = input.label.toLowerCase();
      const name = input.name?.toLowerCase();
      const id = input.id?.toLowerCase();
      
      return label === normalized || 
             name === fieldName || 
             id === fieldName;
    });
    
    if (matched) return matched;
    
    // Try fuzzy matching
    const fieldKeywords = normalized.split(' ');
    
    matched = inputs.find(input => {
      const label = input.label.toLowerCase();
      const placeholder = input.placeholder?.toLowerCase() || '';
      const ariaLabel = input.ariaLabel?.toLowerCase() || '';
      
      const text = `${label} ${placeholder} ${ariaLabel}`;
      
      // Check if all keywords are present
      return fieldKeywords.every(keyword => text.includes(keyword));
    });
    
    return matched;
  }
  
  /**
   * Trigger input events to notify frameworks
   */
  private triggerInputEvents(element: HTMLElement) {
    // Create and dispatch events
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    
    element.dispatchEvent(inputEvent);
    element.dispatchEvent(changeEvent);
    
    // For React
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    
    if (nativeInputValueSetter && element instanceof HTMLInputElement) {
      nativeInputValueSetter.call(element, element.value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}