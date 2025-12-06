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
      (arg.message && arg.message.includes('block not in reader'))
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

    // Prevent infinite reload loops
    const reloadCount = parseInt(localStorage.getItem('crdt_recovery_attempts') || '0');
    if (reloadCount > 3) {
      console.error('Recovery failed after 3 attempts. Please contact support.');
      alert('Application data is corrupted and could not be recovered automatically. Please clear your browser data for this site.');
      localStorage.removeItem('crdt_recovery_attempts');
      return;
    }

    localStorage.setItem('crdt_recovery_attempts', (reloadCount + 1).toString());

    try {
      // Attempt to clear Fireproof databases
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name && (db.name.includes('fireproof') || db.name.includes('attendance'))) {
          console.log(`Deleting database: ${db.name}`);
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    } catch (e) {
      console.error('Error clearing databases:', e);
    }

    // Reload to resync
    console.log('Reloading application...');
    window.location.reload();
  }
});

// Reset recovery counter on successful load (after 10 seconds)
setTimeout(() => {
  localStorage.removeItem('crdt_recovery_attempts');
}, 10000);

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
