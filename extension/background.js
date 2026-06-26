// Syncpad Clipper Chrome Extension - Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Syncpad Clipper service worker initialized.');
});

// Listener for future messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  sendResponse({ status: 'received' });
  return true;
});
