import { callRestApi } from './index'

export const getUserInfos = async (queryParams?: Record<string, any>): Promise<any> => {
    return await callRestApi({ method: 'GET', endpoint: '/api/user-info/get', data: queryParams, loading: false })
};

export const getUnreadCount = async (): Promise<number> => {
    const res = await callRestApi({ method: 'GET', endpoint: '/api/user-info/get', data: { UNREAD_ONLY: true, PageSize: 1, CurrentPage: 1 }, loading: false });
    return res?.TotalCount ?? 0;
};

export const markAllRead = async (): Promise<void> => {
    await callRestApi({ method: 'POST', endpoint: '/api/user-info/mark-read', loading: false });
};
