"use client";
import { getUserInfo, postUserInfo, updateUserRole } from "@/app/Api/apiUser";
import { Filter } from "@/app/component/Filter";
import {
    EyeInvisibleOutlined,
    EyeTwoTone,
    PlusOutlined,
    SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { ConfigProviderProps } from "antd";
import { Button, Input, Modal, Radio, Select, Table } from "antd";
import "bootstrap/dist/css/bootstrap.min.css";
import React, { useEffect, useState } from "react";
import styles from "../../page.module.css";
import DetailAccount from "../FormDetail/DetailAccount/page";
import DetailAccountDocument from "../FormDetail/DetailAccountDocument/page";

type SizeType = ConfigProviderProps["componentSize"];

const ROLE_OPTIONS = [
    { value: "none", label: "Không có quyền" },
    { value: "editer", label: "Editer" },
    { value: "admin", label: "Admin" },
];

const getRoleValue = (record: any) => {
    if (record.IS_ROOT) return "admin";
    if (record.IS_EDITER) return "editer";
    return "none";
};

const Account: React.FC<any> = () => {
    const [size] = useState<SizeType>("large");
    const [data, setData] = useState<any>([]);
    const [userData, setUserData] = useState<any>({});
    const [showPopup, setShowPopup] = useState(false);
    const [showPopupDocument, setShowPopupDocument] = useState(false);
    const [showPopupCreate, setShowPopupCreate] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [roleModal, setRoleModal] = useState<{ open: boolean; record: any }>({
        open: false,
        record: null,
    });
    const [selectedRole, setSelectedRole] = useState<string>("none");

    const getDataUser = async (filter?: any) => {
        const queryParams = { Columns: "Balance", ...filter };
        const response = await getUserInfo(queryParams);
        if (response.success) {
            response.Items.map((value: any, index: any) => {
                value.key = value.USER_ID;
                value.STT = index + 1;
            });
            setData(response.Items);
        }
    };

    const openRoleModal = (record: any) => {
        setSelectedRole(getRoleValue(record));
        setRoleModal({ open: true, record });
    };

    const handleSaveRole = async () => {
        const { record } = roleModal;
        const response = await updateUserRole({
            USER_ID: record.USER_ID,
            IS_ROOT: selectedRole === "admin",
            IS_EDITER: selectedRole === "editer",
        });
        if (response.success) {
            setRoleModal({ open: false, record: null });
            getDataUser();
        }
    };

    const columns = [
        { title: "STT", dataIndex: "STT", width: 20, key: "STT" },
        { title: "Email", dataIndex: "EMAIL", width: 150, key: "EMAIL" },
        {
            title: "Điện thoại",
            dataIndex: "PHONE_NUMBER",
            width: 150,
            key: "PHONE_NUMBER",
        },
        {
            title: "Số dư",
            dataIndex: "BALANCE",
            width: 150,
            render: (_: any, record: any) => (
                <>{new Intl.NumberFormat("vi-VN").format(record.BALANCE)}</>
            ),
        },
        {
            title: "Quyền",
            width: 100,
            render: (_: any, record: any) => {
                const role = getRoleValue(record);
                const color =
                    role === "admin"
                        ? "#f5222d"
                        : role === "editer"
                          ? "#1677ff"
                          : "#aaa";
                const label =
                    role === "admin"
                        ? "Admin"
                        : role === "editer"
                          ? "Editer"
                          : "Không";
                return <span style={{ color, fontWeight: 600 }}>{label}</span>;
            },
        },
        {
            title: "Chức năng",
            width: 220,
            render: (_: any, record: any) => (
                <Radio.Group>
                    <Radio.Button
                        onClick={() => {
                            setShowPopup(true);
                            setUserId(record.USER_ID);
                        }}
                    >
                        Nạp
                    </Radio.Button>
                    <Radio.Button
                        onClick={() => {
                            setShowPopupDocument(true);
                            setUserId(record.USER_ID);
                        }}
                    >
                        Tài liệu
                    </Radio.Button>
                    <Radio.Button
                        onClick={() => openRoleModal(record)}
                        style={{ color: "#fa8c16" }}
                    >
                        <SafetyCertificateOutlined /> Quyền
                    </Radio.Button>
                </Radio.Group>
            ),
        },
    ];

    const togglePopup = async () => {
        await getDataUser();
        setShowPopup(false);
    };
    const togglePopupDocument = async () => {
        await getDataUser();
        setShowPopupDocument(false);
    };

    const onChange = (val: any) => setUserData(val);
    const onSave = async () => {
        const response = await postUserInfo(userData);
        if (response.success) {
            setShowPopupCreate(false);
            getDataUser();
        }
    };

    useEffect(() => {
        getDataUser();
    }, []);

    return (
        <section>
            {showPopupCreate && (
                <div className={`${styles.overlay} ${styles.sizePopUp}`}>
                    <div className={styles.popup}>
                        <div className="row">
                            <div className="col-lg-12 col-xl-12">
                                <div className="row justify-content-center">
                                    <p className="text-center h5 pb-3 pt-3 fw-bold mb-3 mx-1 mx-md-4">
                                        Tạo tài khoản
                                    </p>
                                    <div className="col-md-10 col-lg-10 col-xl-10 order-2 order-lg-1">
                                        <form className="mx-1 mx-md-4">
                                            <div className="d-flex flex-row align-items-center mb-4">
                                                <div className="form-outline flex-fill mb-0">
                                                    <label>Email</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="Nhập email"
                                                        value={
                                                            userData?.EMAIL ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            onChange({
                                                                ...userData,
                                                                EMAIL: e.target
                                                                    .value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="d-flex flex-row align-items-center mb-4">
                                                <div className="form-outline flex-fill mb-0">
                                                    <label>Điện thoại</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="Nhập số điện thoại"
                                                        value={
                                                            userData?.PHONE_NUMBER ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            onChange({
                                                                ...userData,
                                                                PHONE_NUMBER:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="d-flex flex-row align-items-center mb-4">
                                                <div className="form-outline flex-fill mb-0">
                                                    <label>Mật khẩu</label>
                                                    <Input.Password
                                                        size="large"
                                                        placeholder="Nhập mật khẩu"
                                                        onChange={(e) =>
                                                            onChange({
                                                                ...userData,
                                                                PASSWORD:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        iconRender={(
                                                            visible,
                                                        ) =>
                                                            visible ? (
                                                                <EyeTwoTone />
                                                            ) : (
                                                                <EyeInvisibleOutlined />
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex justify-content-center">
                                <button
                                    type="button"
                                    className={`btn btn-success btn-md ${styles.m1}`}
                                    onClick={onSave}
                                >
                                    Lưu
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-primary btn-md ${styles.m1}`}
                                    onClick={() => setShowPopupCreate(false)}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                title="Phân quyền tài khoản"
                open={roleModal.open}
                onOk={handleSaveRole}
                onCancel={() => setRoleModal({ open: false, record: null })}
                okText="Lưu"
                cancelText="Đóng"
            >
                <p style={{ marginBottom: 12 }}>
                    Email: <strong>{roleModal.record?.EMAIL}</strong>
                </p>
                <Select
                    style={{ width: "100%" }}
                    value={selectedRole}
                    onChange={setSelectedRole}
                    options={ROLE_OPTIONS}
                />
            </Modal>

            <div className={`col-md-12 pt-5 ${styles.contentRight}`}>
                <Filter
                    columns={columns}
                    onFilter={async (filter: any) => {
                        await getDataUser(filter);
                    }}
                />
                <Button
                    className={`${styles.buttonFeature}`}
                    onClick={() => setShowPopupCreate(true)}
                    type="primary"
                    shape="round"
                    icon={<PlusOutlined />}
                    size={size}
                >
                    Thêm mới
                </Button>
            </div>

            <div
                className={`col-md-12 ${styles.contentRight} ${styles.transparentTable}`}
            >
                <Table
                    bordered
                    columns={columns}
                    dataSource={data}
                    className={`${styles.gridTable}`}
                />
            </div>

            {showPopup && (
                <DetailAccount onClose={togglePopup} userId={userId} />
            )}
            {showPopupDocument && (
                <DetailAccountDocument
                    onClose={togglePopupDocument}
                    userId={userId}
                />
            )}
        </section>
    );
};

export default Account;
