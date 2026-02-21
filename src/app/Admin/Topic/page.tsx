"use client"
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from "../../page.module.css";
import { useState, useEffect } from "react";
import React from "react";
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ConfigProviderProps, TableProps } from 'antd';
import { Button, Radio, Table, Checkbox } from 'antd';
import DetailTopic from '../FormDetail/DetailTopic/page';
import { deleteTopicById, getTopicInfo } from '@/app/Api/apiTopic';
import Swal from 'sweetalert2';


export default function Topic(this: any) {
    const [data, setData] = useState<any>([]);
    const [topicId, setTopicId] = useState<string | null>(null);

    const [selectedRows, setSelectedRows] = useState<any>([]);
    const [showPopup, setShowPopup] = useState(false);


    const showDeleteConfirm = (value: string) => {
        Swal.fire({
            title: "Thông báo",
            text: "Bạn có muốn xóa chủ đề này không?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Đồng ý",
            cancelButtonText: "Hủy"
        }).then(async (result) => {
            if (result.isConfirmed) {
                var response = await deleteTopicById({ TOPIC_ID: value });
                if (response.success) {
                    await getData();
                }
            }
        });
    };

    const showDeleteArray = () => {
        // confirm({
        //     title: 'Bạn có chắc chắn muốn xóa bản ghi không?',
        //     icon: <ExclamationCircleFilled />,
        //     // content: 'Some descriptions',
        //     okText: 'Xóa',
        //     okType: 'danger',
        //     cancelText: 'Hủy',
        //     async onOk() {
        //         var isDone = false;
        //         try {
        //             if (selectedRows && selectedRows.length > 0) {
        //                 selectedRows.map(async (x) => {
        //                     const queryParams = { DocumentId: x.DocumentId }
        //                     const res = await deleteDocumentById(x.DocumentId, queryParams)
        //                 })
        //             }
        //             if (parentDocumentId == null) {
        //                 getDataDropFilter()
        //             } else {
        //                 getData(parentDocumentId)
        //             }
        //             deleteSuccess()
        //         } catch (error) {
        //             console.error('Có lỗi xảy ra:', error);
        //         }
        //     },
        //     onCancel() {
        //     },
        // });
    }

    const columns: TableProps<any>['columns'] = [
        {
            title: 'STT',
            dataIndex: 'Stt',
            key: 'Stt',
            width: 10
        },
        {
            title: 'Tên chủ đề',
            dataIndex: 'NAME',
            key: 'NAME',
            width: 250
        },
        {
            title: 'Ghim',
            dataIndex: 'IS_PIN',
            render: (text, record: any) => (
                <Checkbox checked={record.IsPin ? true : false} />
            ),
            width: 100
        },
        {
            title: 'Chức năng',
            width: 130,
            render: (text, record) => (
                <Radio.Group>
                    <Radio.Button onClick={() => {
                        setShowPopup(true)
                        setTopicId(record.TOPIC_ID)
                    }} value={record.TOPIC_ID}>Sửa</Radio.Button>
                    <Radio.Button onClick={() => showDeleteConfirm(record.TOPIC_ID)} value="Xoá">Xoá</Radio.Button>
                </Radio.Group>
            ),
        },
    ];


    const rowSelection = {
        onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
            setSelectedRows(selectedRows);
        },
    };


    const getData = async () => {
        var queryParams = { Columns: '*' };
        const response = await getTopicInfo(queryParams);

        if (response.success) {
            if (response.Items && response.Items.length > 0) {
                response.Items.map((value: any, index: any) => {
                    value.key = value.TOPIC_ID
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
                    setTopicId(null)
                }} type="primary" shape="round" icon={<PlusOutlined />} size='large'>
                    Thêm mới
                </Button>
                <Button hidden={true} className={`${styles.buttonFeature}`} type="primary" shape="round" icon={<DeleteOutlined />} onClick={showDeleteArray}>
                    Xoá
                </Button>
            </div>
            {showPopup && <DetailTopic onClose={() => { togglePopup() }} topicId={topicId} />}

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
