"use client"
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from "../../../page.module.css";
import { Input, Typography, InputNumber } from 'antd';
import { useEffect, useState } from "react";
import type { ConfigProviderProps } from 'antd';
import { getUserInfo, postAmountUser } from '@/app/Api/apiUser';
import { useQuery, QueryClient, QueryClientProvider } from 'react-query';
import { values } from 'lodash';

const GetData = async (userId: string | null) => {
  if (userId) {
    const queryParams = { USER_ID: userId };
    var response = await getUserInfo(queryParams);
    if (response.success && response.Items && response.Items.length > 0) {
      // setData(response.Items[0])
      return response.Items[0];
    }
  }
  return {}
}
const { TextArea } = Input;


type SizeType = ConfigProviderProps['componentSize'];
const DetailAccount: React.FC<any> = ({ onClose, userId }) => {

  const { isLoading, error } = useQuery('detailaccount', async () => {
    var user = await GetData(userId);
    setData(user)
    return user;
  });
  const [size, setSize] = useState<SizeType>('small');



  const [user, setData] = useState<any>({});




  if (isLoading) return 'Loading...';
  const onSave = async () => {
    user.REASON = user.REASON ?? "Nạp tiền tài khoản";
    const response = await postAmountUser(user);
    if (response.success) {
      onClose();
    }
  }

  const onChange = (data: any) => {
    console.log(data)
    setData(data)
  };

  if (error) return `An error occurred: ${error}`;

  return (
    <div className={`${styles.overlay} ${styles.sizePopUp}`}>
      <div className={styles.popup}>
        <div className="row">
          <div className="col-lg-12 col-xl-12">
            <div className="row justify-content-center">
              <p className="text-center h5 pb-3 pt-3 fw-bold mb-3 mx-1 mx-md-4">Nạp tiền tài khoản</p>
              <div className="col-md-10 col-lg-6 col-xl-6 order-2 order-lg-1">
                <form className="mx-1 mx-md-4">
                  <div className="d-flex flex-row align-items-center mb-4">
                    <div className="form-outline flex-fill mb-0">
                      <label>Email</label>
                      <Typography>{user?.EMAIL}</Typography>
                    </div>
                  </div>
                  <div className="d-flex flex-row align-items-center mb-4">
                    <div className="form-outline flex-fill mb-0">
                      <label>Điện thoại</label>
                      <Typography>{user?.PHONE_NUMBER}</Typography>
                    </div>
                  </div>
                  <div className="d-flex flex-row align-items-center">
                    <div className="form-outline flex-fill mb-0">
                      <label>Số tiền</label>
                    </div>
                  </div>
                  <div className="d-flex flex-row align-items-center mb-4">
                    <div className="form-outline flex-fill mb-0">
                      <InputNumber style={{ width: '65%' }} className='' placeholder="Nhập số tiền"
                        formatter={value => `${value} đ`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        size='large' min={1} defaultValue={1} onChange={(value) => {
                          onChange({ ...user, AMOUNT: value })
                        }} />
                    </div>
                  </div>
                  <div className="d-flex flex-row align-items-center mb-4">
                    <div className="form-outline flex-fill mb-0">
                      <label>Lý do</label>
                      <TextArea rows={4} placeholder="Nhập lý do" size='large' onChange={(e) => {
                        onChange({ ...user, REASON: e.target.value })
                      }} value={user?.REASON ?? "Nạp tiền tài khoản"} />
                    </div>
                  </div>
                  <div className="d-flex flex-row align-items-center mb-4">
                    <div className="form-outline flex-fill mb-0">
                      <label> </label>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <button type="button" className={`btn btn-success btn-md ${styles.m1}`} onClick={() => { onSave() }}>Nạp</button>
            <button type="button" className={`btn btn-primary btn-md ${styles.m1}`} onClick={() => { onClose() }}>Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const queryClient = new QueryClient();
export default function Index(ctx: any) {
  return (
    <QueryClientProvider client={queryClient}>
      <DetailAccount {...ctx} />
    </QueryClientProvider>
  );
}