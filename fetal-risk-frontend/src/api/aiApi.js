// src/api/aiApi.js
import axiosClient from "./axiosClient";

export const askHealthQuestion = (question, patientId) => {
  return axiosClient.post("/ai_health_search", {
    question,
    patient_id: patientId || null,
  });
};
export const getCareCoachTips = (patientId) =>{
    return axiosClient.post("/ai/care_coach", { patient_id: patientId });
}

export const getDietPlan = (patientId, cuisine, date) => {
  return axiosClient.post("/ai/diet_plan", {
    patient_id: patientId || null,
    cuisine,
    date,
  });
};