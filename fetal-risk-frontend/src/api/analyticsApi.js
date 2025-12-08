// src/api/analyticsApi.js
import api from "./axiosClient";

// GET /api/v1/patients/:patient_id/readings
export const getPatientReadings = (patientId) =>
  api.get(`/patients/${patientId}/readings`);

// GET /api/v1/patients/:patient_id/risk_history
export const getPatientEvaluations = (patientId) =>
  api.get(`/patients/${patientId}/risk_history`);
