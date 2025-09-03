/**
 * Message Handler - Handles communication between content script and extension
 */

import { ExtensionMessage } from '@shared/types';
import { FormPilotContent } from './index';

export class MessageHandler {
  constructor(private content: FormPilotContent) {}
  
  /**
   * Listen for messages from extension
   */
  public listen() {
    chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
      this.handleMessage(message, sendResponse);
      return true; // Keep channel open for async response
    });
  }
  
  /**
   * Handle incoming messages
   */
  private async handleMessage(message: ExtensionMessage, sendResponse: (response: any) => void) {
    try {
      switch (message.type) {
        case 'SCAN_PAGE':
          const inputs = await this.content.scanPage();
          sendResponse({ success: true, data: inputs });
          break;
          
        case 'FILL_FIELDS':
          const { fields, mapping, autoFillThreshold } = message.payload;
          const results = await this.content.fillFields(fields, mapping, autoFillThreshold);
          sendResponse({ success: true, data: results });
          break;
          
        case 'HIGHLIGHT_INPUT':
          const { selector } = message.payload;
          this.content.highlightInput(selector);
          sendResponse({ success: true });
          break;
          
        case 'GET_INPUT':
          const { selector: inputSelector } = message.payload;
          const input = this.content.getInputBySelector(inputSelector);
          sendResponse({ success: true, data: input });
          break;
          
        case 'UPDATE_MAPPING':
          const { field, selector: mappingSelector } = message.payload;
          this.content.updateMapping(field, mappingSelector);
          sendResponse({ success: true });
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
}