import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ERROR_CODES } from './constants/errorCodes';
import { API_BASE } from './config';
import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  registerSW();
}

const isInternalUrl = (url) => {
  if (!url) return false;
  const urlStr = typeof url === 'string' ? url : url.url || url.toString();
  if (urlStr.startsWith('/') || urlStr.startsWith('./') || urlStr.startsWith('../')) return true;
  try {
    const parsed = new URL(urlStr, window.location.origin);
    if (parsed.origin === window.location.origin) return true;
    if (API_BASE && parsed.origin === new URL(API_BASE, window.location.origin).origin) return true;
  } catch (e) {
    return false;
  }
  return false;
};

// Monkey-patch fetch to include credentials for internal sessions without breaking external CDN/CORS requests
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  config = config ? { ...config } : {};

  // Only inject credentials for internal/API requests to prevent CORS wildcard conflicts on external CDNs (like tldraw)
  if (isInternalUrl(resource) && !config.credentials) {
    config.credentials = 'include';
  }

  const response = await originalFetch(resource, config);
  if (response.status === 503) {
    const clone = response.clone();
    try {
      const data = await clone.json();
      if (data.error === ERROR_CODES.ACCOUNT_MIGRATING) {
        window.dispatchEvent(new Event('account_migrating'));
      }
    } catch (e) {}
  }
  return response;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
