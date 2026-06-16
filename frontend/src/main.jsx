import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ERROR_CODES } from './constants/errorCodes';

// Monkey-patch fetch to always include credentials for sessions
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  config = config || {};
  config.credentials = 'include';
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
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
