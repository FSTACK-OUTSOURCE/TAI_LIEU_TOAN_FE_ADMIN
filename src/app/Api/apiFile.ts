import axios from 'axios'
import {callRestApi, getClientSideCookie} from '.'


export const getFiles = async (queryParams?: Record<string, any>, loading?: any): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/file/get', data: queryParams, loading })
};


export const deleteFile = async (fileKey: string, loading?: any): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: `/api/file/remove/${fileKey}`, loading })
};


export const uploadFile = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const token = getClientSideCookie('token');
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}/api/file/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  return res.data;
};
