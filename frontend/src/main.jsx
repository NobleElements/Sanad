import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register';
import { createIdempotentFetch } from './utils/idempotentFetch';

if ('serviceWorker' in navigator) {
  registerSW();
}

// Wrap fetch to inject credentials, attach Idempotency-Key headers on POST requests,
// and coalesce duplicate in-flight/retried submissions on slow connections.
const originalFetch = window.fetch.bind(window);
window.fetch = createIdempotentFetch(originalFetch);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
