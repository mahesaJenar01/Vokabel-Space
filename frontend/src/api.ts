import axios from 'axios';
import type { AppState, Library } from './types';

const API_URL = 'http://localhost:5000/api';

export const fetchLibrary = async (): Promise<Library> => {
  const response = await axios.get(`${API_URL}/library`);
  return response.data;
};

export const fetchUserState = async (): Promise<AppState> => {
  const response = await axios.get(`${API_URL}/user-performance`);
  return response.data;
};

export const saveUserState = async (state: AppState): Promise<void> => {
  await axios.post(`${API_URL}/user-performance`, state);
};