import {callRestApi} from '.'


export const getFiles = async (queryParams?: Record<string, any>, loading?: any): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/file/get', data: queryParams, loading })
};


export const deleteFile = async (fileKey: string, loading?: any): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: `/api/file/remove/${fileKey}`, loading })
};
