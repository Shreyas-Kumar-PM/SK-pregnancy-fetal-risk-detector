// src/api/riskApi.js
import api from "./axiosClient";

// current risk (used by dashboard + alert banner)
export const getCurrentRisk = (patientId) => {
  return api.get(`/patients/${patientId}/current_risk`);
};

// risk history (used by analytics page)
export const getRiskHistory = (patientId) => {
  return api.get(`/patients/${patientId}/risk_history`);
};

// PDF report download (used by DashboardPage handleDownloadReport)
export const downloadRiskReport = (patientId) => {
  return api.get(`/patients/${patientId}/report`, {
    responseType: "blob",
  });
};
