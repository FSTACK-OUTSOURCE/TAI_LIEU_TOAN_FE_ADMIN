"use client";
import { getTransactionInfo } from "@/app/Api/apiTransaction";
import { Filter } from "@/app/component/Filter";
import { FormatDateTime, guidEmpty } from "@/app/constans";
import { Table } from "antd";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState } from "react";
import styles from "../../page.module.css";

export default function HistoryRecharge() {
    const [size, setSize] = useState("large");
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [showPopup, setShowPopup] = useState(false);

    const columns = [
        {
            title: "STT",
            dataIndex: "Stt",
            width: 20,
            hide: true,
            key: "Stt",
        },
        {
            title: "Email",
            dataIndex: "EMAIL",
            width: 100,
            key: "EMAIL",
        },
        {
            title: "Điện thoại",
            dataIndex: "PHONE_NUMBER",
            width: 100,
            key: "PHONE_NUMBER",
        },
        {
            title: "Số tiền",
            dataIndex: "AMOUNT",
            width: 100,
            key: "AMOUNT",
            hide: true,
            render: (text, record) => (
                <>{new Intl.NumberFormat("vi-VN").format(record.AMOUNT)}</>
            ),
        },
        {
            title: "Lý do",
            dataIndex: "REASON",
            width: 300,
            hide: true,
            key: "REASON",
        },
        {
            title: "Ngày",
            dataIndex: "CREATED_DATE",
            width: 300,
            key: "CREATED_DATE",
            render: (text, record) => (
                <>{FormatDateTime(new Date(record.CREATED_DATE))}</>
            ),
        },
    ];

    const start = () => {
        setLoading(true);
        // ajax request after empty completing
        setTimeout(() => {
            setSelectedRowKeys([]);
            setLoading(false);
        }, 1000);
    };
    const togglePopup = () => {
        setShowPopup(!showPopup);
        getDataTransaction();
    };

    const getDataTransaction = async (filter) => {
        const queryParams = { USER_ID: guidEmpty, ...filter };
        const response = await getTransactionInfo(queryParams);
        if (response.Items && response.Items.length > 0) {
            response.Items.map((x, i) => {
                x.key = x.TRANSACTION_ID;
                x.Stt = i + 1;
            });
        }
        setData(response.Items);
    };

    const openPopupAddNew = () => {
        togglePopup();
    };

    useEffect(() => {
        getDataTransaction();
    }, []);

    return (
        <section>
            <div className={`col-md-12 pt-5 ${styles.contentRight}`}>
                <Filter
                    columns={columns}
                    onFilter={async (filter) => {
                        await getDataTransaction(filter);
                    }}
                ></Filter>
            </div>
            <div className={`col-md-12 ${styles.contentRight}`}>
                <Table
                    bordered
                    columns={columns}
                    dataSource={data}
                    className={`${styles.gridTable}`}
                />
            </div>
        </section>
    );
}
