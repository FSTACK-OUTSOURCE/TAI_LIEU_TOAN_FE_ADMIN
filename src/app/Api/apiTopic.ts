import { callRestApi } from '.'


export const getTopicInfo = async (queryParams?: Record<string, any>, loading?: any): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/topic/get', data: queryParams, loading })
};

export const postTopicInfo = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'POST', endpoint: '/api/topic/save', data: queryParams, message: `${queryParams && queryParams.TopicId ? 'Sửa' : 'Thêm'} thành công` })
};

export const deleteTopicById = async (queryParams: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: `/api/topic/delete`, data: queryParams, message: `Xóa thành công` })
};