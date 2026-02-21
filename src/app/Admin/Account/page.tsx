"use client"
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from "../../page.module.css";
import { useEffect, useState } from "react";
import React from "react";
import type { ConfigProviderProps, TableColumnsType } from 'antd';
import { Radio, Button, Table, Input } from 'antd';
import { PlusOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import DetailAccount from '../FormDetail/DetailAccount/page';
import { getUserInfo, postUserInfo } from '@/app/Api/apiUser';
import { Filter } from '@/app/Component/Filter'
import DetailAccountDocument from '../FormDetail/DetailAccountDocument/page';


type SizeType = ConfigProviderProps['componentSize'];

const Account: React.FC<any> = () => {
    const [passwordVisible, setPasswordVisible] = useState<any>(false);
    const [size, setSize] = useState<SizeType>('large');
    const [selectedRows, setSelectedRows] = useState<any>([]);
    const [data, setData] = useState<any>([]);
    const [userData, setUserData] = useState<any>({});
    const [showPopup, setShowPopup] = useState(false);
    const [showPopupDocument, setShowPopupDocument] = useState(false);
    const [showPopupCreate, setShowPopupCreate] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    // const { isLoading, error, data } = useQuery('account', getDataUser);
    const columns = [
        {
            title: 'STT',
            dataIndex: 'STT',
            width: 20,
            key: 'STT',
            hide: true
        },
        {
            title: 'Email',
            dataIndex: 'EMAIL',
            width: 150,
            key: 'EMAIL',
        },
        {
            title: 'Điện thoại',
            dataIndex: 'PHONE_NUMBER',
            width: 150,
            key: 'PHONE_NUMBER',
        },
        {
            title: 'Số dư',
            dataIndex: 'BALANCE',
            hide: true,
            width: 150,
            render: (text: any, record: any) => (
                <>{new Intl.NumberFormat('vi-VN').format(record.BALANCE)}</>
            ),
        },
        {
            title: 'Chức năng',
            width: 150,
            hide: true,
            render: (text: any, record: any) => (
                <Radio.Group value={size} onChange={(e) => setSize(e.target.value)}>
                    <Radio.Button onClick={() => {
                        setShowPopup(true)
                        setUserId(record.USER_ID);
                    }} >Nạp</Radio.Button>
                    <Radio.Button onClick={() => {
                        setShowPopupDocument(true)
                        setUserId(record.USER_ID);
                    }} >Tài liệu</Radio.Button>
                </Radio.Group>
            ),
        },
    ];


    const rowSelection = {
        onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
            setSelectedRows(selectedRows);
        }
    };

    const getDataUser = async (filter?: any) => {
        const queryParams = { Columns: 'Balance', ...filter };
        const response = await getUserInfo(queryParams);
        if (response.success) {
            response.Items.map((value: any, index: any) => {
                value.key = value.USER_ID
                value.STT = index + 1
            })
            setData(response.Items);
        }
    };





    const togglePopup = async () => {
        await getDataUser()
        setShowPopup(!showPopup);
    };
    
    const togglePopupDocument = async () => {
        await getDataUser()
        setShowPopupDocument(!showPopupDocument);
    };


    const onChange = (userData: any) => {
        setUserData(userData)
    };
    const onSave = async () => {
        const response = await postUserInfo(userData);
        if (response.success) {
            setShowPopupCreate(false);
            getDataUser();
        }
    }

    useEffect(() => {
        getDataUser();
    }, []);


    return (
        <section>
            {showPopupCreate ? <div className={`${styles.overlay} ${styles.sizePopUp}`}>
                <div className={styles.popup}>
                    <div className="row">
                        <div className="col-lg-12 col-xl-12">
                            <div className="row justify-content-center">
                                <p className="text-center h5 pb-3 pt-3 fw-bold mb-3 mx-1 mx-md-4">Tạo tài khoản</p>
                                <div className="col-md-10 col-lg-10 col-xl-10 order-2 order-lg-1">
                                    <form className="mx-1 mx-md-4">
                                        <div className="d-flex flex-row align-items-center mb-4">
                                            <div className="form-outline flex-fill mb-0">
                                                <label>Email</label>
                                                <input type="text" className="form-control" placeholder='Nhập email' value={userData?.EMAIL} onChange={(e) => {
                                                    onChange({ ...userData, EMAIL: e.target.value })
                                                }} />
                                            </div>
                                        </div>
                                        <div className="d-flex flex-row align-items-center mb-4">
                                            <div className="form-outline flex-fill mb-0">
                                                <label>Điện thoại</label>
                                                <input type="text" className="form-control" placeholder='Nhập số điện thoại' value={userData?.PHONE_NUMBER} onChange={(e) => {
                                                    onChange({ ...userData, PHONE_NUMBER: e.target.value })
                                                }} />
                                            </div>
                                        </div>
                                        <div className="d-flex flex-row align-items-center mb-4">
                                            <div className="form-outline flex-fill mb-0">
                                                <label>Mật khẩu</label>
                                                <Input.Password
                                                    size='large'
                                                    placeholder="Nhập mật khẩu"
                                                    onChange={(e) => {
                                                        onChange({ ...userData, PASSWORD: e.target.value })
                                                    }}
                                                    iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                                                />
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex justify-content-center">
                            <button type="button" className={`btn btn-success btn-md ${styles.m1}`} onClick={onSave}>Lưu</button>
                            <button type="button" className={`btn btn-primary btn-md ${styles.m1}`} onClick={() => { setShowPopupCreate(false) }}>Đóng</button>
                        </div>
                    </div>
                </div>
            </div> : <></>}
            <div className={`col-md-12 pt-5 ${styles.contentRight}`}>
                <Filter columns={columns} onFilter={async (filter: any) => {
                    await getDataUser(filter)
                }} ></Filter>
                <Button className={`${styles.buttonFeature}`} onClick={() => {
                    setShowPopupCreate(true)
                }} type="primary" shape="round" icon={<PlusOutlined />} size={size}>
                    Thêm mới
                </Button>
            </div>

            <div className={`col-md-12 ${styles.contentRight} ${styles.transparentTable}`}>
                <Table rowSelection={rowSelection} bordered columns={columns} dataSource={data} className={`${styles.gridTable}`} />
            </div>
            {showPopup && <DetailAccount onClose={() => { togglePopup() }} userId={userId} />}
            {showPopupDocument && <DetailAccountDocument onClose={() => { togglePopupDocument() }} userId={userId} />}
        </section>


    );
}

export default Account;