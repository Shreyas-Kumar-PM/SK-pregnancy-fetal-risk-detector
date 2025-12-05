import client from './axiosClient';

export const registerUser = (data) =>
  client.post('/register', { user: data });

export const loginUser = (email, password) =>
  client.post('/login', { email, password });

export const fetchMe = () => client.get('/me');
