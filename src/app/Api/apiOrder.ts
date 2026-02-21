import {callRestApi} from './index'



export const getHistoryOrder = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/order/history', data: queryParams })
};


export const getOrders = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/order/get', data: queryParams })
};

export const saveOrder = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'POST', endpoint: '/api/order/save', data: queryParams })
};
export const deleteOrder = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'POST', endpoint: '/api/order/delete', data: queryParams })
};
