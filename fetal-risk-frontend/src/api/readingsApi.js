import client from './axiosClient';

export const getReadings = (patientId) =>
  client.get(`/patients/${patientId}/readings`);

export const createReading = (patientId, data) =>
  client.post(`/patients/${patientId}/readings`, { reading: data });
