import { callRestApi } from '.'


export const getDocumentOrders = async (queryParams?: Record<string, any>, loading?: any): Promise<any> => {
    return await callRestApi({ method: 'GET', endpoint: '/api/document-order/get', data: queryParams, loading })
};

export const saveDocumentOrders = async (queryParams?: Record<string, any>): Promise<any> => {
    return await callRestApi({ method: 'POST', endpoint: '/api/document-order/save', data: queryParams, message: `Cập nhật thành công` })
};

export const deleteDocumentOrders = async (queryParams?: Record<string, any>): Promise<any> => {
    return await callRestApi({ method: 'GET', endpoint: '/api/document-order/delete', data: queryParams, message: `Cập nhật thành công` })
};
