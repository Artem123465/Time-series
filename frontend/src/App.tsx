import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import Dashboard from './pages/Dashboard';
import TimeseriesEditor from './pages/TimeseriesEditor';
import BenchmarkPage from './pages/BenchmarkPage';
import BenchmarkComparisonPage from './pages/BenchmarkComparisonPage';
import TimeseriesListPage from './pages/TimeseriesListPage';
import InstructionsPage from './pages/InstructionsPage';
import ProtectedLayout from './components/ProtectedLayout';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/timeseries-editor" element={<TimeseriesEditor />} />
          <Route path="/timeseries-editor/:id" element={<TimeseriesEditor />} />
          <Route path="/benchmark" element={<BenchmarkPage />} />
          <Route path="/benchmark-comparison" element={<BenchmarkComparisonPage />} />
          <Route path="/timeseries-list" element={<TimeseriesListPage />} />
          <Route path="/instructions" element={<InstructionsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;