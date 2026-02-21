import axios, { AxiosResponse } from 'axios';
import { cookies } from 'next/headers';

const baseURL = 'https://localhost:44387';

const api = axios.create({
  baseURL,
});

export const getGoogleLogin = async (): Promise<any> => {
  try {
    const response: AxiosResponse<any> = await api.get(`${baseURL}/google/login`);
    return response;
  } catch (error) {
    console.error('Có lỗi xảy ra:', error);
    throw error;
  }
};

export const getGooglResponse = async (): Promise<any> => {
  try {
    const response: AxiosResponse<any> = await api.get(`${baseURL}/google/response`);
    return response;
  } catch (error) {
    console.error('Có lỗi xảy ra:', error);
    throw error;
  }
};