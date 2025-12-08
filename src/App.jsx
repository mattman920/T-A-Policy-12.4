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
import DASettings from './pages/DASettings';
import DatabaseSettings from './pages/DatabaseSettings';
import HealthCheckPrintView from './components/print/HealthCheckPrintView';
import FiveTierPrintView from './components/print/FiveTierPrintView';
function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route path="/print/health-check" element={<HealthCheckPrintView />} />
          <Route path="/print/5-tier-analysis" element={<FiveTierPrintView />} />
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
            <Route path="settings/da" element={<DASettings />} />
            <Route path="settings/databases" element={<DatabaseSettings />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
