import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Polyfill process for Fireproof/Netlify
if (typeof window !== 'undefined' && !window.process) {
  window.process = { env: {} };
}

import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>,
)
