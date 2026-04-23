import { callRestApi } from './index'

export const getBlog = async (queryParams?: Record<string, any>): Promise<any> => {
    return await callRestApi({ method: 'GET', endpoint: '/api/blog/get', data: queryParams })
};

export const saveBlog = async (queryParams?: Record<string, any>): Promise<any> => {
    return await callRestApi({ method: 'POST', endpoint: '/api/blog/save', data: queryParams, message: 'Lưu thành công' })
};

export const deleteBlogById = async (blogId: string): Promise<any> => {
    return await callRestApi({ method: 'DELETE', endpoint: `/api/blog/delete/${blogId}`, message: 'Xóa thành công' })
};
