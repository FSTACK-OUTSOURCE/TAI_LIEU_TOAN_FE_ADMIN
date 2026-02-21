"use client"
import axios from 'axios';
import Swal from 'sweetalert2'

// axios.defaults.headers.post['Content-Type'] = 'application/json';
// // axios.defaults.withCredentials = true;
// // if (token) {
// //     axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
// // }
// const instance = (baseUrl: any) => axios.create({
//     baseURL: baseUrl || process.env.NEXT_PUBLIC_API_URL!,
//     // Authorization: 'AUTH TOKEN'
// });



export const getClientSideCookie = (name: string): string | undefined => {
    if (document) {
        const cookieValue = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')[1];
        return cookieValue;
    }
};


function redirectLogin() {
    var path = window.location.pathname
    var search = window.location.search
    window.location.href = window.location.origin + '/Login?redirectUrl=' + path + search;
}


export const callRestApi = async ({ loading = true, headers, ...arg }: any) => {
    // console.log(process.env)
    arg.method = arg.method || 'GET'

    const api = axios.create({
        baseURL: arg.baseUrl || process.env.NEXT_PUBLIC_API_URL!
    });

    api.interceptors.request.use(async (config) => {
        const token = getClientSideCookie('token');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    });

    const blobToJson = async (blob: Blob): Promise<any> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                try {
                    // Parse the text content as a JSON object.
                    const json = JSON.parse(reader.result as string); // Cast result to string for TypeScript
                    resolve(json);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(reader.error);
            };

            // Read the Blob content as text.
            reader.readAsText(blob);
        });
    };

    const fnMethod = (arg: any) => {
        if (arg.method == 'POST') {
            if (headers) {
                return api.post(arg.endpoint, arg.data, { headers })
            }
            return api.post(arg.endpoint, arg.data)
        }
        if (arg.method == 'DOWNLOAD') {
            return api.post(arg.endpoint, arg.data, {
                responseType: 'blob'  // This is crucial for handling the binary data
            })
        }
        if (arg.method == 'DELETE') {
            return api.delete(arg.endpoint)
        }
        return api.get(arg.endpoint, { params: arg.data })
    }

    const result = async () => {
        if (loading) {
            Swal.fire({
                title: 'Vui lòng đợi...',
                text: 'Yêu cầu của bạn đang được thực hiện',
                showConfirmButton: false,
                allowOutsideClick: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });
        }

        try {
            const response = await fnMethod(arg);

            Swal.close();
            if (arg.message) {
                await Swal.fire({
                    title: 'Thông báo',
                    html: arg.message,
                    icon: 'success',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
            if (arg.method == 'DOWNLOAD') {
                return Promise.resolve({ data: response.data, success: true });
            }
            return Promise.resolve({ ...response.data, success: true });
        } catch (error: any) {
            Swal.close();
            if ([415, 400].includes(error?.response?.status)) {
                if (arg.method == 'DOWNLOAD') {
                    var data = await blobToJson(error?.response?.data);
                    var message = data.errors.join('<br/>')
                    Swal.fire({
                        title: data.title,
                        html: message,
                        icon: 'warning'
                    });
                    return Promise.resolve({ success: false });
                }
                var message = error?.response?.data?.errors.join('<br/>')
                await Swal.fire({
                    title: error?.response?.data.title,
                    html: message,
                    icon: 'warning'
                });
                return Promise.resolve({ ...error?.response.data, success: false });
            }
            if (error?.response?.status === 401) {
                redirectLogin()
            }
            Swal.fire({
                title: 'Thông báo',
                text: 'Lỗi hệ thống',
                icon: 'error'
            });
            return Promise.resolve({ success: false });
        }

    }
    return await result();

}