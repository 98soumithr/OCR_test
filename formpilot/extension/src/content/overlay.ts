/**
 * Badge Overlay - Shows confidence badges and tooltips on filled fields
 */

import { Candidate } from '@shared/types';

export class BadgeOverlay {
  private badges: Map<string, HTMLElement> = new Map();
  private styleSheet: HTMLStyleElement | null = null;
  
  constructor() {
    this.injectStyles();
  }
  
  /**
   * Add a badge to a filled field
   */
  public addBadge(selector: string, confidence: number, source: Candidate) {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) return;
    
    // Remove existing badge if any
    this.removeBadge(selector);
    
    // Create badge container
    const badge = document.createElement('div');
    badge.className = 'formpilot-badge';
    badge.setAttribute('data-confidence', confidence.toString());
    
    // Set confidence level class
    if (confidence >= 0.95) {
      badge.classList.add('formpilot-badge-high');
    } else if (confidence >= 0.85) {
      badge.classList.add('formpilot-badge-medium');
    } else {
      badge.classList.add('formpilot-badge-low');
    }
    
    // Create badge icon
    const icon = document.createElement('span');
    icon.className = 'formpilot-badge-icon';
    icon.textContent = '✓';
    badge.appendChild(icon);
    
    // Create tooltip
    const tooltip = this.createTooltip(source);
    badge.appendChild(tooltip);
    
    // Position badge relative to input
    const rect = element.getBoundingClientRect();
    badge.style.position = 'absolute';
    badge.style.left = `${rect.right + window.scrollX - 25}px`;
    badge.style.top = `${rect.top + window.scrollY + (rect.height / 2) - 10}px`;
    badge.style.zIndex = '10000';
    
    // Add to document
    document.body.appendChild(badge);
    this.badges.set(selector, badge);
    
    // Add hover listeners
    badge.addEventListener('mouseenter', () => {
      tooltip.classList.add('formpilot-tooltip-visible');
    });
    
    badge.addEventListener('mouseleave', () => {
      tooltip.classList.remove('formpilot-tooltip-visible');
    });
  }
  
  /**
   * Remove a badge
   */
  public removeBadge(selector: string) {
    const badge = this.badges.get(selector);
    if (badge) {
      badge.remove();
      this.badges.delete(selector);
    }
  }
  
  /**
   * Clear all badges
   */
  public clearAll() {
    this.badges.forEach(badge => badge.remove());
    this.badges.clear();
  }
  
  /**
   * Create tooltip element
   */
  private createTooltip(source: Candidate): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'formpilot-tooltip';
    
    // Add content
    const content = document.createElement('div');
    content.className = 'formpilot-tooltip-content';
    
    // Source info
    const sourceInfo = document.createElement('div');
    sourceInfo.className = 'formpilot-tooltip-source';
    sourceInfo.innerHTML = `
      <strong>Source:</strong> Page ${source.page + 1}<br>
      <strong>Value:</strong> ${this.escapeHtml(source.value)}<br>
      <strong>Confidence:</strong> ${(source.confidence * 100).toFixed(1)}%
    `;
    content.appendChild(sourceInfo);
    
    // Source text if available
    if (source.sourceText) {
      const sourceText = document.createElement('div');
      sourceText.className = 'formpilot-tooltip-text';
      sourceText.innerHTML = `
        <strong>Extracted from:</strong><br>
        <em>${this.escapeHtml(source.sourceText)}</em>
      `;
      content.appendChild(sourceText);
    }
    
    tooltip.appendChild(content);
    return tooltip;
  }
  
  /**
   * Escape HTML for safe display
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Inject styles for badges and tooltips
   */
  private injectStyles() {
    if (this.styleSheet) return;
    
    this.styleSheet = document.createElement('style');
    this.styleSheet.textContent = `
      .formpilot-badge {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .formpilot-badge:hover {
        transform: scale(1.1);
      }
      
      .formpilot-badge-high {
        background: #22c55e;
        color: white;
      }
      
      .formpilot-badge-medium {
        background: #f59e0b;
        color: white;
      }
      
      .formpilot-badge-low {
        background: #ef4444;
        color: white;
      }
      
      .formpilot-badge-icon {
        font-size: 12px;
        font-weight: bold;
      }
      
      .formpilot-tooltip {
        position: absolute;
        top: -5px;
        left: 25px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
        z-index: 10001;
      }
      
      .formpilot-tooltip-visible {
        opacity: 1;
        pointer-events: auto;
      }
      
      .formpilot-tooltip-content {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        min-width: 250px;
        max-width: 350px;
        font-size: 12px;
        line-height: 1.5;
        color: #374151;
      }
      
      .formpilot-tooltip-source {
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .formpilot-tooltip-text {
        color: #6b7280;
      }
      
      .formpilot-highlight {
        outline: 2px solid #3b82f6 !important;
        outline-offset: 2px !important;
        animation: formpilot-pulse 2s;
      }
      
      @keyframes formpilot-pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
        }
        50% {
          box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
        }
      }
      
      [data-formpilot-filled="true"] {
        background-color: #f0fdf4 !important;
        border-color: #22c55e !important;
      }
    `;
    
    document.head.appendChild(this.styleSheet);
  }
}