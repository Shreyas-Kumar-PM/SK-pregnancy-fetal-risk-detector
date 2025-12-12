// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import PatientHistoryPage from './pages/PatientHistoryPage';
import PatientsListPage from './pages/PatientsListPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

// ⭐ Pregnancy articles
import ArticlesPage from './pages/ArticlesPage';

// ⭐ Patient update page
import PatientEditPage from './pages/PatientEditPage';

// ⭐ Gamification (streaks & rewards)
import GamificationPage from './pages/GamificationPage';

// ⭐ NEW — Relaxation & Guided Breathing
import RelaxationPage from './pages/RelaxationPage';

const App = () => {
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem("token"),
    patientId: localStorage.getItem("patientId"),
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

                  {/* Default redirect */}
                  <Route
                    path="/"
                    element={
                      <Navigate
                        to={`/patients/${auth.patientId}/dashboard`}
                        replace
                      />
                    }
                  />

                  {/* Patient routes */}
                  <Route
                    path="/patients/:patientId/dashboard"
                    element={<DashboardPage />}
                  />

                  <Route
                    path="/patients/:patientId/history"
                    element={<PatientHistoryPage />}
                  />

                  <Route
                    path="/patients/:patientId/analytics"
                    element={<AnalyticsDashboard />}
                  />

                  <Route
                    path="/patients/:patientId/update"
                    element={<PatientEditPage />}
                  />

                  <Route path="/patients" element={<PatientsListPage />} />
                  <Route path="/settings" element={<SettingsPage />} />

                  {/* Extra features */}
                  <Route path="/articles" element={<ArticlesPage />} />
                  <Route path="/gamification" element={<GamificationPage />} />

                  {/* ⭐ NEW Relaxation Route */}
                  <Route path="/relaxation" element={<RelaxationPage />} />

                  {/* Fallback */}
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
