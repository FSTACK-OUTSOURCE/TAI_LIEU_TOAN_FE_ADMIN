"use client"
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from '../../page.module.css';
import { useEffect, useState } from 'react';
import { Table, Button, Radio, Tag, InputNumber, Modal, Upload, Image } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getPaymentInfo, savePaymentInfo, deletePaymentInfoById } from '@/app/Api/apiPaymentInfo';
import { getClientSideCookie } from '@/app/Api';
import axios from 'axios';
import Swal from 'sweetalert2';

const emptyForm = { PAYMENT_ID: null, VALUE: null, QR_URL: '' };

export default function PaymentInfoPage() {
    const [data, setData] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [fileList, setFileList] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const res = await getPaymentInfo();
        if (res.success) {
            setData((res.Items || []).map((item, idx) => ({ ...item, key: item.PAYMENT_ID, STT: idx + 1 })));
        }
    };

    const openCreate = () => {
        setForm(emptyForm);
        setFileList([]);
        setShowModal(true);
    };

    const openEdit = (record) => {
        setForm({ PAYMENT_ID: record.PAYMENT_ID, VALUE: record.VALUE, QR_URL: record.QR_URL || '' });
        setFileList(record.QR_URL ? [{
            uid: '-1',
            name: 'qr.png',
            status: 'done',
            url: `${process.env.NEXT_PUBLIC_API_URL}${record.QR_URL}`,
        }] : []);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.VALUE) {
            Swal.fire('Lỗi', 'Vui lòng nhập số tiền', 'warning');
            return;
        }
        const res = await savePaymentInfo(form);
        if (res.success) {
            setShowModal(false);
            fetchData();
        }
    };

    const handleDelete = async (record) => {
        const confirm = await Swal.fire({
            title: 'Xác nhận xóa',
            text: `Xóa mệnh giá ${Number(record.VALUE).toLocaleString('vi-VN')}đ?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
        });
        if (!confirm.isConfirmed) return;
        const res = await deletePaymentInfoById(record.PAYMENT_ID);
        if (res.success) fetchData();
    };

    const uploadFile = async ({ file, onSuccess, onError }) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/file/upload`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${getClientSideCookie('token')}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            onSuccess(response.data);
            setForm(prev => ({ ...prev, QR_URL: response.data.FilePath }));
        } catch (err) {
            onError(err);
        }
    };

    const columns = [
        { title: 'STT', dataIndex: 'STT', width: 60 },
        {
            title: 'Số tiền (VNĐ)',
            dataIndex: 'VALUE',
            render: (val) => val ? <Tag color="blue">{Number(val).toLocaleString('vi-VN')}đ</Tag> : '—',
        },
        {
            title: 'Ảnh QR',
            width: 120,
            render: (_, record) => record.QR_URL
                ? <Image
                    src={`${process.env.NEXT_PUBLIC_API_URL}${record.QR_URL}`}
                    alt="QR"
                    width={80}
                    height={80}
                    style={{ objectFit: 'contain' }}
                />
                : '—',
        },
        {
            title: 'Chức năng',
            width: 160,
            render: (_, record) => (
                <Radio.Group>
                    <Radio.Button onClick={() => openEdit(record)}>Sửa</Radio.Button>
                    <Radio.Button danger onClick={() => handleDelete(record)}>Xóa</Radio.Button>
                </Radio.Group>
            ),
        },
    ];

    return (
        <section>
            <div className="col-md-12 pt-3 px-3">
                <h4 className="fw-bold mb-3">Quản lý thông tin thanh toán</h4>
                <div className="d-flex gap-2 mb-3">
                    <Button type="primary" shape="round" icon={<PlusOutlined />} size="large" onClick={openCreate}>
                        Thêm mệnh giá
                    </Button>
                </div>
                <div className={`col-md-12 ${styles.transparentTable}`}>
                    <Table
                        bordered
                        columns={columns}
                        dataSource={data}
                        className={styles.gridTable}
                        pagination={false}
                    />
                </div>
            </div>

            <Modal
                title={form.PAYMENT_ID ? 'Chỉnh sửa mệnh giá' : 'Thêm mệnh giá mới'}
                open={showModal}
                onOk={handleSave}
                onCancel={() => setShowModal(false)}
                okText="Lưu"
                cancelText="Hủy"
            >
                <div className="mb-3">
                    <label className="form-label fw-semibold">Số tiền (VNĐ)</label>
                    <InputNumber
                        className="w-100"
                        min={1000}
                        step={10000}
                        formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={val => val.replace(/,/g, '')}
                        value={form.VALUE}
                        onChange={val => setForm(prev => ({ ...prev, VALUE: val }))}
                        placeholder="VD: 100000"
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label fw-semibold">Ảnh QR code</label>
                    <Upload
                        customRequest={uploadFile}
                        listType="picture-card"
                        fileList={fileList}
                        accept="image/*"
                        maxCount={1}
                        onChange={({ fileList: newList }) => setFileList(newList)}
                        onRemove={() => {
                            setFileList([]);
                            setForm(prev => ({ ...prev, QR_URL: '' }));
                        }}
                    >
                        {fileList.length === 0 && (
                            <div>
                                <PlusOutlined />
                                <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
                            </div>
                        )}
                    </Upload>
                </div>
            </Modal>
        </section>
    );
}
