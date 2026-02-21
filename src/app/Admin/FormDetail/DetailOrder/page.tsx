'use client'
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from "../../../page.module.css";
import { Input, Select } from 'antd';
import { useEffect, useState } from 'react';
import { getUserInfo } from '@/app/Api/apiUser';
import { saveOrder } from '@/app/Api/apiOrder';

const DetailOrder : React.FC<any> = ({ onClose,...props }) => {

  const [users, setUsers] = useState([]);
  const [data, setData] = useState<Record<string, any>>();

  const onChange = (data: any) => {
    setData(data)
  };



  const getDataDropFilter = async () => {
    const queryParams = {};
    const response = await getUserInfo(queryParams);
    console.log(response)
    if (response.Items && response.Items.length > 0) {
      response.Items.map((x: any) => {
        x.key = x.UserId
        // if (!x.Em || x.email.length > 0) {
        //   x.userName = x.email
        // } else if (!x.phoneNumber || x.phoneNumber.length > 0) {
        //   x.userName = x.phoneNumber
        // }
      })
    }
    setUsers(response.Items);
  };

  const handleSaveClick = async () => {
    const response = await saveOrder(data);
    if (response.success) {
      onClose();
    }
  }

  useEffect(() => {
    getDataDropFilter();
  }, []);
  return (
    <div className={`${styles.overlay} ${styles.sizePopUp}`}>
      <div className={styles.popup}>
        <div className="row">
          <div className="col-lg-12 col-xl-12">
            <div className="row justify-content-center">
              <p className="text-center h5 pt-3 pb-3 fw-bold mb-3 mx-1 mx-md-4">Thêm lịch sử mua</p>
              <div className="col-md-10 col-lg-6 col-xl-6 order-2 order-lg-1">
                <div className="d-flex flex-row align-items-center mb-4">
                  <div className="form-outline flex-fill mb-0">
                    <div className='row'>
                      <label>Tài khoản</label>
                      <Select className='col-md-12'
                        placeholder="Chọn tài khoản"
                        size='large'
                        showSearch
                        style={{ width: '100%' }}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={
                          users.map((x: any, key) => (
                            { value: x.UserId, label: x.Email }
                          ))}
                        onChange={(value) => {
                          onChange({ ...data, UserId: value })
                        }} >
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-10 col-lg-6 col-xl-6 order-2 order-lg-1">
                <div className="d-flex flex-row align-items-center mb-4">
                  <div className="form-outline flex-fill mb-0">
                    <label>Đường dẫn tài liệu</label>
                    <Input placeholder="Nhập đường dẫn tài liệu" size='large' onChange={(e) => {
                      const urlParams = new URLSearchParams(new URL(e.target.value).search);
                      var documentId = urlParams.get('parentDocumentId')
                      onChange({ ...data, DocumentId: documentId })
                    }} />
                  </div>
                </div>
              </div>
              <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1">
                <div className="d-flex justify-content-center mx-4 mb-3 mb-lg-4">
                  <button type="button" className={`btn btn-primary btn-md ${styles.m1}`} onClick={handleSaveClick}>Lưu</button>
                  <button type="button" className={`btn btn-primary btn-md ${styles.m1}`} onClick={onClose}>Đóng</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailOrder;