import type { Message } from '../shared/messages';

chrome.runtime.onInstalled.addListener(() => {
  console.log('FormPilot installed');
});

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === 'PING') sendResponse({ ok: true });
});

