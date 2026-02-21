import { callRestApi } from './index'


export const postDocumentInfo = async (formData: any): Promise<any> => {
  var headers = {
    'Content-Type': 'multipart/form-data'
  }
  return await callRestApi({ method: 'POST', endpoint: '/api/document/save', headers, data: formData, message: `Lưu thành công` })
};

export const getDocumentInfo = async (queryParams?: Record<string, any>, loading?: any): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/document/get', data: { ...queryParams, IS_HIDDEN: true }, loading })
};

export const getChangeParentDocument = async (queryParams?: Record<string, any>, loading?: any): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/document/get-change-parent', data: { ...queryParams }, loading })
};
export const postDocumentDownFile = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'DOWNLOAD', endpoint: '/api/file/download', data: queryParams })
};

export const getParentDocuments = async (queryParams?: Record<string, any>): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: '/api/document/get-parent', data: { ...queryParams, IS_HIDDEN: true } })
};


export const deleteDocumentById = async (documentId: string): Promise<any> => {
  return await callRestApi({ method: 'GET', endpoint: `/api/document/delete`, message: `Xóa thành công`, data: { DOCUMENT_IDS : documentId } })
};

export const quickCreateFolderDocument = async (formData: any): Promise<any> => {
  return await callRestApi({ method: 'POST', endpoint: '/api/document/quick-create-folder', data: formData, message: `Lưu thành công` })
};