"use client"
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from "../../page.module.css";
import dayjs from 'dayjs';
import { useState, useEffect } from "react";
import React from "react";
import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Radio, Table, Checkbox, Anchor, Input, Select, DatePicker } from 'antd';
import DetailDocument from '../FormDetail/DetailDocument/page';
import QuickCreateDocument from '../FormDetail/QuickCreateDocument/page';
import { deleteDocumentById, getDocumentInfo, getParentDocuments, quickCreateFolderDocument } from '@/app/Api/apiDocument';
import { getTopicInfo } from '@/app/Api/apiTopic';
import { useSearchParams, useRouter } from 'next/navigation'
import { Breadcrumb } from "antd";
import Swal from 'sweetalert2';
import { FormatDateTime, guidEmpty } from '@/app/constans'



export default function Document() {
    const router = useRouter();
    const [size, setSize] = useState('large');
    const [data, setData] = useState([]);
    const [breadData, setBreadData] = useState([]);
    const { Link } = Anchor;
    const [selectedRows, setSelectedRows] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [quickCreateDocumentId, setQuickCreateDocumentId] = useState(null);
    const [documentId, setDocumentId] = useState(null);
    const [topics, setTopics] = useState([]);
    const [filter, setFilter] = useState({ NAME: '', TOPIC_IDS: '', CREATED_DATE_FROM: null, CREATED_DATE_TO: null });
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,  // Number of items per page
        total: data.length, // Total number of data items
    });

    const searchParams = useSearchParams()

    const parentDocumentId = searchParams.get('parentDocumentId') || guidEmpty;
    const key = searchParams.get('IDENTITY_KEY');
    const showDeleteConfirm = (value) => {
        Swal.fire({
            title: "Thông báo",
            text: "Bạn có muốn xóa tài liệu này không?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Đồng ý",
            cancelButtonText: "Hủy"
        }).then(async (result) => {
            if (result.isConfirmed) {
                var response = await deleteDocumentById(value);
                if (response.success) {
                    await getData({ PARENT_DOCUMENT_ID: parentDocumentId, CurrentPage: pagination.current, PageSize: pagination.pageSize });
                }
                else {
                    var errors = []

                    selectedRows.forEach(x => {
                        errors.push(`${x.KEY} - ${x.DOCUMENT_NAME}: ${response.data.find(z => z == x.DOCUMENT_ID).errors[0]}`)
                    })
                    Swal.fire({
                        title: "Chi tiết thông tin",
                        html: errors.join("<br>"),
                        icon: 'warning'
                    });
                }
            }
        });
    };

    const quickCreate = async () => {
        var result = await Swal.fire({
            title: "Thông báo",
            text: "Bạn có muốn tạo nhanh thư mục không?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Đồng ý",
            cancelButtonText: "Hủy"
        });

        if (result.isConfirmed) {
            var response = await quickCreateFolderDocument({PARENT_DOCUMENT_ID: parentDocumentId})
            if (response.success) {
                
                    await getData({ PARENT_DOCUMENT_ID: parentDocumentId, CurrentPage: pagination.current, PageSize: pagination.pageSize });
            }
        }
    }

    const showDeleteArray = () => {
        Swal.fire({
            title: "Thông báo",
            text: "Bạn có muốn xóa tài liệu này không?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Đồng ý",
            cancelButtonText: "Hủy"
        }).then(async (result) => {
            if (result.isConfirmed) {
                var deleteIds = []
                selectedRows.forEach(x => {
                    deleteIds.push(x.DOCUMENT_ID)
                });

                var response = await deleteDocumentById(deleteIds.join(","));
                if (response.success) {
                    await getData({ PARENT_DOCUMENT_ID: parentDocumentId, IDENTITY_KEY: key, CurrentPage: pagination.current, PageSize: pagination.pageSize });
                }
                else {
                    var errors = []
                    console.log(response)
                    selectedRows.forEach(x => {
                        console.log(x)
                        errors.push(`${x.IDENTITY_KEY} - ${x.NAME}: ${response.data.find(z => z.data == x.DOCUMENT_ID).errors[0]}`)
                    })
                    Swal.fire({
                        title: "Chi tiết thông tin",
                        html: errors.join("<br>"),
                        icon: 'warning'
                    });
                }
            }
        });
    }

    const columns = [
        {
            title: 'STT',
            dataIndex: 'ORDER_NO',
            key: 'ORDER_NO',
            width: 10,
            hide: true
        },
        {
            title: 'Tên tài liệu',
            // dataIndex: 'Name',
            render: (text, record) => (
                <span style={{ cursor: 'pointer' }}>{record.NAME}</span>
            ),
            key: 'NAME',
            width: 250
        },
        {
            title: 'Khóa',
            dataIndex: 'IDENTITY_KEY',
            width: 50,
        },
        {
            title: 'Người đăng',
            dataIndex: 'CREATED_USER',
            key: 'CREATED_USER',
            width: 100
        },
        {
            title: 'Ngày đăng',
            dataIndex: 'CREATED_DATE',
            render: (text, record) => (
                <>{FormatDateTime(new Date(record.CREATED_DATE))}</>
            ),
            width: 100
        },
        {
            title: 'Thư mục',
            dataIndex: 'IS_FOLDER',
            render: (text, record) => (
                <Checkbox checked={record.IS_FOLDER ? true : false} />
            ),
            width: 50,
            hide: true
        },
        {
            title: 'Ẩn',
            dataIndex: 'IS_HIDDEN',
            render: (text, record) => (
                <Checkbox checked={record.IS_HIDDEN ? true : false} />
            ),
            width: 10
        },
        {
            title: 'Giá tiền',
            dataIndex: 'Price',
            render: (text, record) => (
                <>{new Intl.NumberFormat('vi-VN').format(record.PRICE)}</>
            ),
            width: 100,
            hide: true
        },
        {
            title: 'Chức năng',
            width: 130,
            render: (text, record) => (
                <Radio.Group value={size} onChange={(e) => setSize(e.target.value)}>
                    <Radio.Button onClick={() => {
                        if (!record.IS_FOLDER) {
                            setQuickCreateDocumentId(record.DOCUMENT_ID);
                            setShowQuickCreate(true);
                        } else {
                            setShowPopup(true);
                            setDocumentId(record.DOCUMENT_ID);
                        }
                    }} value={record.DOCUMENT_ID}>Sửa</Radio.Button>
                    {/* <Radio.Button onClick={() => showDeleteConfirm(record.DOCUMENT_ID)} value="Xoá">Xoá</Radio.Button> */}
                </Radio.Group>
            ),
            hide: true
        },
    ];

    const handleTableChange = async (pagination, filters, sorter) => {
        // Update pagination state

        await getData({ PARENT_DOCUMENT_ID: parentDocumentId, IDENTITY_KEY: key, CurrentPage: pagination.current, PageSize: pagination.pageSize });
    };


    const rowSelection = {
        onChange: (selectedRowKeys, selectedRows) => {
            setSelectedRows(selectedRows);
        }
    };


    const getData = async (props) => {
        const { PARENT_DOCUMENT_ID, filter } = props
        var queryParams = { Columns: 'CREATED_USER', ...filter, ...props };
        const response = await getDocumentInfo(queryParams);

        if (response.success) {

            if (response.Items && response.Items.length > 0) {
                response.Items.map((value, index) => {
                    value.key = value.DOCUMENT_ID
                    value.Stt = index + 1
                })
            }
            setData(response.Items)

            setPagination({
                current: response.CurrentPage,
                pageSize: response.PageSize,  // Number of items per page
                total: response.TotalCount
            });

            if (PARENT_DOCUMENT_ID !== undefined) {
                var parentDocuments = await getParentDocuments({ DOCUMENT_IDs: PARENT_DOCUMENT_ID, Columns: '*', loading: false })
                breadData.length = 0;
                breadData.push({
                    title: <Button type="text" className='fw-bold' block onClick={() => handleDoubleClick(guidEmpty)}>
                        Root
                    </Button>, documentId: guidEmpty
                })
                if (parentDocuments.Data) {
                    parentDocuments.Data.map((x) => {
                        breadData.push({
                            title: <Button type="text" className={`${styles.titleColor} fw-bold`} block onClick={() => {
                                router.push(`/Admin/Document?parentDocumentId=${x.DOCUMENT_ID}`, { scroll: false })
                            }}>
                                {x.NAME}
                            </Button>, documentId: x.DOCUMENT_ID
                        })
                    })
                }
            }
        }
    };

    const hasChildDocuments = async (documentId) => {
        const response = await getDocumentInfo({
            PARENT_DOCUMENT_ID: documentId,
            Columns: 'DOCUMENT_ID',
            CurrentPage: 1,
            PageSize: 1,
        }, false);

        return response.success && (response.TotalCount > 0 || response.Items?.length > 0);
    };

    const handleDoubleClick = async (documentId, checkChildren = false) => {
        if (checkChildren && !(await hasChildDocuments(documentId))) {
            return;
        }

        router.push(`/Admin/Document?parentDocumentId=${documentId}`, { scroll: false })

    };

    const togglePopup = async (documentId) => {
        await getData({ PARENT_DOCUMENT_ID: documentId, IDENTITY_KEY: key, CurrentPage: pagination.current, PageSize: pagination.pageSize });
        setShowPopup(!showPopup);
    };


    useEffect(() => {
        getData({ PARENT_DOCUMENT_ID: parentDocumentId, IDENTITY_KEY: key, CurrentPage: 1, PageSize: pagination.pageSize });
        getTopicInfo(undefined, false).then(res => {
            if (res.success) setTopics(res.Items || []);
        });
    }, [parentDocumentId, key]);

    const applyFilter = () => {
        const hasActiveFilter = filter.NAME?.trim() || filter.TOPIC_IDS || filter.CREATED_DATE_FROM || filter.CREATED_DATE_TO;
        // Khi có filter thì tìm toàn bộ, không giới hạn theo thư mục hiện tại
        const activeFilter = {
            ...(filter.NAME?.trim() ? { NAME: filter.NAME.trim() } : {}),
            ...(filter.TOPIC_IDS ? { TOPIC_IDS: filter.TOPIC_IDS } : {}),
            ...(filter.CREATED_DATE_FROM ? { CREATED_DATE_FROM: filter.CREATED_DATE_FROM } : {}),
            ...(filter.CREATED_DATE_TO ? { CREATED_DATE_TO: filter.CREATED_DATE_TO } : {}),
        };
        getData({
            ...(hasActiveFilter ? {} : { PARENT_DOCUMENT_ID: parentDocumentId }),
            IDENTITY_KEY: key,
            CurrentPage: 1,
            PageSize: pagination.pageSize,
            ...activeFilter,
        });
    };

    const resetFilter = () => {
        const empty = { NAME: '', TOPIC_IDS: '', CREATED_DATE_FROM: null, CREATED_DATE_TO: null };
        setFilter(empty);
        getData({ PARENT_DOCUMENT_ID: parentDocumentId, IDENTITY_KEY: key, CurrentPage: 1, PageSize: pagination.pageSize });
    };

    return (
        <section>
            <div className={`col-md-12 pt-4 ${styles.contentRight}`}>
                {/* Filter bar */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Input
                        placeholder="Tìm tên tài liệu..."
                        value={filter.NAME}
                        allowClear
                        style={{ width: 240 }}
                        onChange={e => setFilter(f => ({ ...f, NAME: e.target.value }))}
                        onPressEnter={applyFilter}
                    />
                    <DatePicker.RangePicker
                        placeholder={['Từ ngày', 'Đến ngày']}
                        format="DD/MM/YYYY"
                        value={[
                            filter.CREATED_DATE_FROM ? dayjs(filter.CREATED_DATE_FROM) : null,
                            filter.CREATED_DATE_TO ? dayjs(filter.CREATED_DATE_TO) : null,
                        ]}
                        onChange={(dates) => setFilter(f => ({
                            ...f,
                            CREATED_DATE_FROM: dates?.[0]?.format('YYYY-MM-DD') ?? null,
                            CREATED_DATE_TO: dates?.[1]?.format('YYYY-MM-DD') ?? null,
                        }))}
                    />
                    <Select
                        placeholder="Chọn chủ đề..."
                        allowClear
                        style={{ width: 200 }}
                        value={filter.TOPIC_IDS || undefined}
                        options={topics.map(t => ({ label: t.NAME, value: t.TOPIC_ID }))}
                        onChange={val => setFilter(f => ({ ...f, TOPIC_IDS: val ?? '' }))}
                    />
                    <Button type="primary" shape="round" icon={<SearchOutlined />} onClick={applyFilter}>
                        Tìm kiếm
                    </Button>
                    <Button shape="round" onClick={resetFilter}>
                        Xóa lọc
                    </Button>
                </div>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button className={`${styles.buttonFeature}`} onClick={() => {
                        setShowPopup(true)
                        setDocumentId(null)
                    }} type="primary" shape="round" icon={<PlusOutlined />} size={size}>
                        Thêm mới
                    </Button>
                    <Button className={`${styles.buttonFeature}`} type="primary" shape="round" icon={<DeleteOutlined />} size={size} onClick={showDeleteArray}>
                        Xoá
                    </Button>
                    <Button className={`${styles.buttonFeature}`} type="primary" shape="round" icon={<PlusOutlined />} size={size} onClick={quickCreate}>
                        Tạo nhanh thư mục
                    </Button>
                    <Button className={`${styles.buttonFeature}`} type="primary" shape="round" icon={<PlusOutlined />} size={size} onClick={() => setShowQuickCreate(true)}>
                        Tạo nhanh tài liệu con
                    </Button>
                </div>
            </div>
            {showPopup && <DetailDocument onClose={() => { togglePopup(parentDocumentId) }} documentId={documentId} parentDocumentId={parentDocumentId} />}
            {showQuickCreate && <QuickCreateDocument onClose={() => { setShowQuickCreate(false); setQuickCreateDocumentId(null); getData({ PARENT_DOCUMENT_ID: parentDocumentId, IDENTITY_KEY: key, CurrentPage: pagination.current, PageSize: pagination.pageSize }); }} parentDocumentId={parentDocumentId} documentId={quickCreateDocumentId} />}
            <div className={`col-md-12 ${styles.contentRight}`}>
                <Breadcrumb
                    items={breadData}
                />
            </div>
            <div className={`col-md-12 ${styles.contentRight} ${styles.transparentTable}`}>
                <Table
                    rowSelection={{
                        ...rowSelection,
                    }}
                    onRow={(record, rowIndex) => {
                        return {
                            onDoubleClick: (event) => {
                                if (record.IS_FOLDER) {
                                    handleDoubleClick(record.DOCUMENT_ID, true)
                                }
                            }, // double click row
                        };
                    }}
                    pagination={{
                        pageSizeOptions: ['10', '20', '30'],  // Page size options
                        showSizeChanger: true,
                        ...pagination,  // Include the pagination state
                        onChange: (page, pageSize) => {
                            setPagination({ current: page, pageSize }); // Update pagination state
                        },
                    }}
                    bordered columns={columns}
                    dataSource={data}
                    onChange={handleTableChange}
                    className={`${styles.gridTable}`} />
            </div>
        </section >
    );
};
