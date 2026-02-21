import {callRestApi} from '.'


export const getGroups = async (queryParams?: Record<string, any>, loading?: any): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/group/get', data: queryParams, loading })
};

export const saveGroups = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'POST', endpoint: '/api/group/save', data: queryParams,message: `Cập nhật thành công` })
};

export const deleteGroups = async (queryParams?: Record<string, any>, loading?: any): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/group/delete', data: queryParams, loading })
};