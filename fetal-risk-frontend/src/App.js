import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import PatientHistoryPage from './pages/PatientHistoryPage';
import PatientsListPage from './pages/PatientsListPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

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
                  <Route
                    path="/"
                    element={<Navigate to={`/patients/${auth.patientId}/dashboard`} />}
                  />

                  <Route
                    path="/patients/:patientId/dashboard"
                    element={<DashboardPage />}
                  />
                  <Route
                    path="/patients/:patientId/history"
                    element={<PatientHistoryPage />}
                  />
                  <Route
                    path="/patients"
                    element={<PatientsListPage />}
                  />
                  <Route
                    path="/settings"
                    element={<SettingsPage />}
                  />

                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
