"use client"
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from "../../page.module.css";
import { useState, useEffect } from "react";
import React from "react";
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Radio, Table, Checkbox } from 'antd';
import DetailGroup from '../FormDetail/DetailGroup/page';
import Swal from 'sweetalert2';
import { getGroups } from '@/app/Api/apiGroup';


export default function Group() {
    const [data, setData] = useState([]);
    const [groupId, setGroupId] = useState(null);

    const [selectedRows, setSelectedRows] = useState([]);
    const [showPopup, setShowPopup] = useState(false);


    const showDeleteConfirm = (value) => {
        Swal.fire({
            title: "Thông báo",
            text: "Bạn có muốn xóa bộ tài liệu này không?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Đồng ý",
            cancelButtonText: "Hủy"
        }).then(async (result) => {
            if (result.isConfirmed) {
                var response = await deleteTopicById(value);
                if (response.success) {
                    await getData();
                }
            }
        });
    };


    const columns = [
        {
            title: 'STT',
            dataIndex: 'ORDER_NO',
            key: 'ORDER_NO',
            width: 10
        },
        {
            title: 'Tên bộ tài liệu',
            dataIndex: 'GROUP_NAME',
            key: 'GROUP_NAME',
            width: 250
        },
        {
            title: 'Chức năng',
            width: 130,
            render: (text, record) => (
                <Radio.Group>
                    <Radio.Button onClick={() => {
                        setShowPopup(true)
                        setGroupId(record.GROUP_ID)
                    }} value={record.GROUP_ID}>Sửa</Radio.Button>
                    <Radio.Button onClick={() => showDeleteConfirm(record.GROUP_ID)} value="Xoá">Xoá</Radio.Button>
                </Radio.Group>
            ),
        },
    ];


    const rowSelection = {
        onChange: (selectedRowKeys, selectedRows) => {
            setSelectedRows(selectedRows);
        },
    };


    const getData = async () => {
        var queryParams = { };
        const response = await getGroups(queryParams);
    
        if (response.success) {
            if (response.Items && response.Items.length > 0) {
                response.Items.map((value, index) => {
                    value.key = value.GROUP_ID
                    value.Stt = index + 1
                })
            }
            setData(response.Items)
        }
    };

    const togglePopup = async () => {
        await getData();
        setShowPopup(!showPopup);
    };

    useEffect(() => {
        getData();
    }, []);

    return (
        <section>
            <div className={`col-md-12 pt-5 ${styles.contentRight}`}>
                <Button onClick={() => {
                    setShowPopup(true)
                    setGroupId(null)
                }} type="primary" shape="round" icon={<PlusOutlined />} size='large'>
                    Thêm mới
                </Button>
            </div>
            {showPopup && <DetailGroup onClose={() => { togglePopup() }} groupId={groupId} />}

            <div className={`col-md-12 ${styles.contentRight} ${styles.transparentTable}`}>
                <Table
                    rowSelection={{
                        ...rowSelection,
                    }}
                    bordered columns={columns}
                    dataSource={data}
                    className={`${styles.gridTable}`} />
            </div>
        </section >
    );
};
