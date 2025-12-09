// ✅ src/api/aiPatternsApi.js
import axiosClient from "./axiosClient";

export const analyzePatterns = (patientId) => {
  // hits: POST /api/v1/patients/:patient_id/ai_patterns
  return axiosClient.post(`/patients/${patientId}/ai_patterns`);
};
