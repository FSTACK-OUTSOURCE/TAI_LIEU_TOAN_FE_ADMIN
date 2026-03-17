import { callRestApi } from './index'

export const getPaymentInfo = async (queryParams?: Record<string, any>): Promise<any> => {
    return await callRestApi({ method: 'GET', endpoint: '/api/payment-info/get', data: queryParams })
};

export const savePaymentInfo = async (queryParams?: Record<string, any>): Promise<any> => {
    return await callRestApi({ method: 'POST', endpoint: '/api/payment-info/save', data: queryParams, message: 'Lưu thành công' })
};

export const deletePaymentInfoById = async (paymentId: string): Promise<any> => {
    return await callRestApi({ method: 'DELETE', endpoint: `/api/payment-info/delete/${paymentId}`, message: 'Xóa thành công' })
};
