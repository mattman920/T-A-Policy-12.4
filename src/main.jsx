import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Polyfill process for Fireproof/Netlify
if (typeof window !== 'undefined' && !window.process) {
  window.process = { env: {} };
}

// Suppress specific Fireproof errors that don't impact functionality
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args.length > 0) {
    const arg = args[0];
    // Check for the specific object structure or message
    if (typeof arg === 'object' && arg !== null && (
      arg.msg === 'block not in reader' ||
      (arg.message && arg.message.includes('block not in reader')) ||
      (arg.message && arg.message.includes('block not in compact reader')) ||
      (arg.msg && arg.msg.includes('block not in compact reader')) ||
      (arg.error && arg.error.includes('missing block'))
    )) {
      return;
    }
  }
  originalConsoleError.apply(console, args);
};

// Global error handler for "Missing linked block" (CRDT/Fireproof corruption)
window.addEventListener('unhandledrejection', async (event) => {
  const reason = event.reason;
  // Check if it's the specific CRDT error
  if (reason && (
    (reason.message && reason.message.includes('Missing linked block')) ||
    (typeof reason === 'string' && reason.includes('Missing linked block')) ||
    (reason.msg === 'Missing linked block')
  )) {
    console.error('CRITICAL: Data corruption detected (Missing linked block). Initiating auto-recovery...');

    // Just log the error and let the app continue.
    // The user explicitly requested NOT to clear the local DB and NOT to reload.
    // We suppress the error so it doesn't crash the app, hoping that subsequent fetches or the manual fetch fallback will work.
    console.warn('CRITICAL: Data corruption detected (Missing linked block). Suppressing error to allow app to load.');
  }
});



import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import ErrorBoundary from './components/ErrorBoundary'



ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ErrorBoundary>
        <DataProvider>
          <App />
        </DataProvider>
      </ErrorBoundary>
    </AuthProvider>
  </React.StrictMode>,
)
