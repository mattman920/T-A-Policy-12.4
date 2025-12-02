import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import ReportsGenerator from './pages/ReportsGenerator';
import Projections from './pages/Projections';
import DAIssuance from './pages/DAIssuance';
import Settings from './pages/Settings';
import LogViolation from './pages/LogViolation';
import Scorecard from './pages/Scorecard';
import GeneralConfiguration from './pages/GeneralConfiguration';
import ViolationPenalties from './pages/ViolationPenalties';
import Login from './components/Login';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Loading...</div>;
  }

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (!session && !isLocal) {
    return <Login />;
  }

  return (
    <ThemeProvider>
      {isLocal && !session && (
        <div style={{
          backgroundColor: '#f59e0b',
          color: '#000',
          textAlign: 'center',
          padding: '0.5rem',
          fontWeight: 'bold',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999
        }}>
          ⚠️ Local Dev Mode: Login Bypassed (Read-Only/Limited Access)
        </div>
      )}
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="reports" element={<ReportsGenerator />} />
            <Route path="projections" element={<Projections />} />
            <Route path="da-issuance" element={<DAIssuance />} />
            <Route path="log-violation" element={<LogViolation />} />
            <Route path="scorecard" element={<Scorecard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/general" element={<GeneralConfiguration />} />
            <Route path="settings/violations" element={<ViolationPenalties />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
