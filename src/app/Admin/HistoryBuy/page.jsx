"use client";
import { getHistoryOrder } from "@/app/Api/apiOrder";
import { Filter } from "@/app/Component/Filter";
import { FormatDateTime, guidEmpty } from "@/app/constans";
import { Table } from "antd";
import "bootstrap/dist/css/bootstrap.min.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "../../page.module.css";
import DetailOrder from "../FormDetail/DetailOrder/page";

export default function HistoryBuy() {
    const router = useRouter();
    const [size, setSize] = useState("large");
    const [data, setData] = useState([]);
    const [showPopup, setShowPopup] = useState(false);

    const togglePopup = async () => {
        await getDataHisoryOrder();
        setShowPopup(!showPopup);
    };

    const columns = [
        {
            title: "STT",
            dataIndex: "Stt",
            hide: true,
        },
        {
            title: "Email",
            dataIndex: "EMAIL",
        },
        {
            title: "Tài liệu",
            dataIndex: "DOCUMENT_NAME",
        },
        {
            title: "Ngày",
            dataIndex: "CREATED_DATE",
            render: (text, record) => (
                <>{FormatDateTime(new Date(record.CREATED_DATE))}</>
            ),
        },
    ];

    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    const onSelectChange = (newSelectedRowKeys) => {
        console.log("selectedRowKeys changed: ", newSelectedRowKeys);
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const getDataHisoryOrder = async (filter) => {
        const queryParams = { USER_ID: guidEmpty, ...filter };
        const response = await getHistoryOrder(queryParams);
        if (response.Items && response.Items.length > 0) {
            response.Items.map((x, i) => {
                x.key = x.ORDER_ID;
                x.Stt = i + 1;
            });
        }
        setData(response.Items);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
    };
    const hasSelected = selectedRowKeys.length > 0;

    const handleDoubleClick = (documentId) => {
        router.push(`/Admin/Document?parentDocumentId=${documentId}`, {
            scroll: false,
        });
    };

    useEffect(() => {
        getDataHisoryOrder();
    }, []);

    return (
        <section>
            <div className={`col-md-12 pt-5 ${styles.contentRight}`}>
                <Filter
                    columns={columns}
                    onFilter={async (filter) => {
                        await getDataHisoryOrder(filter);
                    }}
                ></Filter>
            </div>

            {showPopup && (
                <DetailOrder
                    onClose={() => {
                        togglePopup();
                    }}
                />
            )}
            <div className={`col-md-12 ${styles.contentRight}`}>
                <Table
                    rowSelection={rowSelection}
                    bordered
                    columns={columns}
                    dataSource={data}
                    className={`${styles.gridTable}`}
                    onRow={(record, rowIndex) => {
                        return {
                            onDoubleClick: (event) => {
                                if (record.DOCUMENT_NAME) {
                                    handleDoubleClick(record.DOCUMENT_ID);
                                }
                            }, // double click row
                        };
                    }}
                />
            </div>
        </section>
    );
}
