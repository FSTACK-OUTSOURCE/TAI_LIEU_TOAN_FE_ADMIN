import { callRestApi } from './index'

export const getUserInfos = async (queryParams?: Record<string, any>): Promise<any> => {
    return await callRestApi({ method: 'GET', endpoint: '/api/user-info/get', data: queryParams, loading: false })
};
