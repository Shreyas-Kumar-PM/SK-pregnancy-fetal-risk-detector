// src/api/explainApi.js
import api from "./axiosClient";

export const explainRisk = (risk) => {
  // backend expects { risk: { ... } }
  return api.post("/explain", { risk });
};
