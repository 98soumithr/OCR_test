/**
 * FormPilot Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Get UI elements
  const openSidebarBtn = document.getElementById('openSidebar');
  const scanPageBtn = document.getElementById('scanPage');
  const clearBadgesBtn = document.getElementById('clearBadges');
  const backendStatus = document.getElementById('backendStatus');
  const inputCount = document.getElementById('inputCount');
  const documentCount = document.getElementById('documentCount');

  // Check backend status
  checkBackendStatus();

  // Update UI with current status
  updateStatus();

  // Event listeners
  openSidebarBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({ tabId: tabs[0].id });
        window.close();
      }
    });
  });

  scanPageBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SCAN_PAGE' }, (response) => {
          if (response) {
            inputCount.textContent = response.length;
          }
        });
      }
    });
  });

  clearBadgesBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'CLEAR_BADGES' });
      }
    });
  });

  async function checkBackendStatus() {
    try {
      const response = await fetch('http://localhost:8000/health');
      if (response.ok) {
        backendStatus.textContent = '✅ Online';
        backendStatus.style.color = '#22c55e';
      } else {
        backendStatus.textContent = '❌ Error';
        backendStatus.style.color = '#ef4444';
      }
    } catch (error) {
      backendStatus.textContent = '❌ Offline';
      backendStatus.style.color = '#ef4444';
    }
  }

  async function updateStatus() {
    // Get document count
    chrome.runtime.sendMessage({ type: 'GET_DOCUMENTS' }, (response) => {
      if (response?.documents) {
        documentCount.textContent = response.documents.length;
      }
    });

    // Get input count for current page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SCAN_PAGE' }, (response) => {
          if (response) {
            inputCount.textContent = response.length;
          }
        });
      }
    });
  }
});