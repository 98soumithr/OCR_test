/**
 * FormPilot Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const openSidebarButton = document.getElementById('open-sidebar') as HTMLButtonElement;
  const statusElement = document.getElementById('status') as HTMLDivElement;

  // Open sidebar when button is clicked
  openSidebarButton.addEventListener('click', async () => {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.id) {
        // Open side panel
        await chrome.sidePanel.open({ tabId: tab.id });
        
        // Close popup
        window.close();
      }
    } catch (error) {
      console.error('Failed to open sidebar:', error);
      statusElement.textContent = 'Failed to open sidebar';
    }
  });

  // Check if current tab is valid for form filling
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    
    if (!tab || !tab.url) {
      statusElement.textContent = 'No active tab';
      openSidebarButton.disabled = true;
      return;
    }
    
    // Check if tab is valid for form filling
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('file://')) {
      statusElement.textContent = 'Cannot use on this page';
      openSidebarButton.disabled = true;
      return;
    }
    
    statusElement.textContent = 'Ready to use';
  });
});