import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import PatientHistoryPage from './pages/PatientHistoryPage';
import PatientsListPage from './pages/PatientsListPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard'; // analytics page

const App = () => {
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem('token'),
    patientId: localStorage.getItem('patientId'),
  }));

  const isAuthenticated = !!auth.token && !!auth.patientId;

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage setAuth={setAuth} />} />
        <Route path="/register" element={<RegisterPage setAuth={setAuth} />} />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <MainLayout auth={auth} setAuth={setAuth}>
                <Routes>
                  {/* default -> redirect to current patient's dashboard */}
                  <Route
                    path="/"
                    element={
                      <Navigate
                        to={`/patients/${auth.patientId}/dashboard`}
                        replace
                      />
                    }
                  />

                  <Route
                    path="/patients/:patientId/dashboard"
                    element={<DashboardPage />}
                  />

                  <Route
                    path="/patients/:patientId/history"
                    element={<PatientHistoryPage />}
                  />

                  {/* ✅ NEW: analytics route with patientId */}
                  <Route
                    path="/patients/:patientId/analytics"
                    element={<AnalyticsDashboard />}
                  />

                  <Route
                    path="/patients"
                    element={<PatientsListPage />}
                  />

                  <Route
                    path="/settings"
                    element={<SettingsPage />}
                  />

                  {/* catch-all inside layout -> go to dashboard */}
                  <Route
                    path="*"
                    element={
                      <Navigate
                        to={`/patients/${auth.patientId}/dashboard`}
                        replace
                      />
                    }
                  />
                </Routes>
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
