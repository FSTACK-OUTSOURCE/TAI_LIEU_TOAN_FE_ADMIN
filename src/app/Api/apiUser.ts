import {callRestApi} from './index'



export const getTokenByUser = async (queryParams?: Record<string, string>): Promise<any> => {
  return await callRestApi({ method: 'POST', endpoint: '/api/user/token', data: queryParams, message: 'Đăng nhập thành công' })
};

export const postAmountUser = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'POST', endpoint: '/api/transaction/save', data: queryParams, message: `Nạp thành công`})
};

export const getUserInfo = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/user/get', data: queryParams })
};

export const postUserInfo = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'POST', endpoint: '/api/user/save', data: queryParams, message: `Tạo tài khoản thành công` })
};


export const deleteUserById = async (topicId: string): Promise<any> => {
  return await callRestApi({ method: 'DELETE', endpoint: `/api/user/delete/${topicId}`, message: `Xóa thành công` })
};

export const updateUserRole = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'POST', endpoint: '/api/user/update-role', data: queryParams, message: 'Cập nhật quyền thành công' })
};