import client from './axiosClient';

export const getCurrentRisk = (patientId) =>
  client.get(`/patients/${patientId}/current_risk`);

export const getRiskHistory = (patientId) =>
  client.get(`/patients/${patientId}/risk_history`);
