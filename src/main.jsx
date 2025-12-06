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

// Global error handler for other critical issues (optional, keeping it simple for now)
// Removed previous aggressive 'block not in reader' handler as per user request to just suppress logs.

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
