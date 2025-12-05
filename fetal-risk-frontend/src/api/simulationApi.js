import client from './axiosClient';

export const simulateReading = (patientId, mode) =>
  client.post(`/patients/${patientId}/simulate_reading`, mode ? { mode } : {});
