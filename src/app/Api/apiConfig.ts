import {callRestApi} from '.'


export const getConfigs = async (queryParams?: Record<string, any>, loading?: any): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/config/get', data: queryParams, loading })
};

export const saveConfigs = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'POST', endpoint: '/api/config/save', data: queryParams,message: `Cập nhật thành công` })
};
