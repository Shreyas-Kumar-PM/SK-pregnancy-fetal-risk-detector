import client from './axiosClient';

export const getPatients = () => client.get('/patients');
export const getPatient = (id) => client.get(`/patients/${id}`);
export const createPatient = (data) => client.post('/patients', { patient: data });
export const updatePatient = (id, data) => client.put(`/patients/${id}`, { patient: data });
