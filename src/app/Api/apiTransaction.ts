import {callRestApi} from './index'


export const postTransactionInfo = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'POST', endpoint: '/api/transaction/save', data: queryParams })
};

export const getTransactionInfo = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/transaction/get', data: queryParams })
};

export const getTransactionBalance = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/transaction/balance', data: queryParams })
};