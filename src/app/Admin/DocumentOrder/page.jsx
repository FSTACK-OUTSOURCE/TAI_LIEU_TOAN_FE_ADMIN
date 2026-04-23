"use client";
import {
    deleteDocumentOrders,
    getDocumentOrders,
} from "@/app/Api/apiDocumentOrder";
import { Filter } from "@/app/component/Filter";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Checkbox, Radio, Table } from "antd";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState } from "react";
import styles from "../../page.module.css";
import DetailDocumentOrder from "../FormDetail/DetailDocumentOrder/page";

const DocumentOrder = () => {
    const [size, setSize] = useState("large");
    const [selectedRows, setSelectedRows] = useState([]);
    const [data, setData] = useState([]);
    const [documentOrderData, setdocumentOrderData] = useState({});
    const [showPopup, setShowPopup] = useState(false);
    const [documentOrderId, setDocumentOrderId] = useState(null);
    // const { isLoading, error, data } = useQuery('account', getDataUser);
    const columns = [
        {
            title: "Thứ tự hiển thị",
            dataIndex: "ORDER_NO",
            width: 150,
            key: "ORDER_NO",
        },
        {
            title: "Tài liệu",
            dataIndex: "DOCUMENT_NAME",
            width: 150,
            key: "DOCUMENT_NAME",
        },
        {
            title: "Khóa",
            dataIndex: "IDENTITY_KEY",
            width: 50,
        },
        {
            title: "Ẩn",
            dataIndex: "IS_HIDDEN",
            render: (text, record) => (
                <Checkbox checked={record.IS_HIDDEN ? true : false} />
            ),
            width: 10,
        },
        {
            title: "Chức năng",
            width: 150,
            hide: true,
            render: (text, record) => (
                <Radio.Group
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                >
                    <Radio.Button
                        onClick={() => {
                            setShowPopup(true);
                            setDocumentOrderId(record.DOCUMENT_ORDER_ID);
                        }}
                    >
                        Sửa
                    </Radio.Button>
                    <Radio.Button
                        onClick={async () => {
                            await deleteDocumentOrders({
                                DOCUMENT_ORDER_ID: record.DOCUMENT_ORDER_ID,
                            });
                            await getData();
                        }}
                    >
                        Xóa
                    </Radio.Button>
                </Radio.Group>
            ),
        },
    ];

    const rowSelection = {
        onChange: (selectedRowKeys, selectedRows) => {
            setSelectedRows(selectedRows);
        },
    };

    const getData = async (filter) => {
        const queryParams = { ...filter };
        const response = await getDocumentOrders(queryParams);
        if (response.success) {
            response.Items.map((value, index) => {
                value.key = value.DOCUMENT_ORDER_ID;
                value.STT = index + 1;
            });
            setData(response.Items);
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
                <Filter
                    columns={columns}
                    onFilter={async (filter) => {
                        await getData(filter);
                    }}
                ></Filter>
                <Button
                    className={`${styles.buttonFeature}`}
                    onClick={() => {
                        setShowPopup(true);
                    }}
                    type="primary"
                    shape="round"
                    icon={<PlusOutlined />}
                    size={size}
                >
                    Thêm mới
                </Button>
            </div>

            {showPopup && (
                <DetailDocumentOrder
                    onClose={() => {
                        togglePopup();
                    }}
                    documentOrderId={documentOrderId}
                />
            )}
            <div
                className={`col-md-12 ${styles.contentRight} ${styles.transparentTable}`}
            >
                <Table
                    rowSelection={rowSelection}
                    bordered
                    columns={columns}
                    dataSource={data}
                    className={`${styles.gridTable}`}
                />
            </div>
        </section>
    );
};

export default DocumentOrder;
