"use client";
import { deleteBlogById, getBlog, saveBlog } from "@/app/Api/apiBlog";
import { uploadFile } from "@/app/Api/apiFile";
import { ReactQuill } from "@/app/component/TextEditor";
import { FormatDateTime } from "@/app/constans";
import {
    BarChartOutlined,
    PlusOutlined,
    RobotOutlined,
    UnorderedListOutlined,
} from "@ant-design/icons";
import { Button, Input, Modal, Radio, Table, Tabs, Tag, Tooltip } from "antd";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import styles from "../../page.module.css";

const { TextArea } = Input;

const getCookie = (name) =>
    document.cookie
        .split("; ")
        .find((r) => r.startsWith(`${name}=`))
        ?.split("=")[1] ?? null;

const getUserIdFromToken = () => {
    try {
        const token = getCookie("token");
        if (!token) return null;
        return JSON.parse(atob(token.split(".")[1]))?.UserId ?? null;
    } catch {
        return null;
    }
};

const emptyForm = {
    BLOG_ID: null,
    TITLE: "",
    DESCRIPTION: "",
    CONTENT: "",
    THUMBNAIL: "",
    FILE_URL: "",
    DOCUMENT_URL: "",
};

export default function BlogPage() {
    const [data, setData] = useState([]);
    const [activeTab, setActiveTab] = useState("list");
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [selectedRows, setSelectedRows] = useState([]);

    const [showAutoModal, setShowAutoModal] = useState(false);
    const [autoForm, setAutoForm] = useState({ driver_url: "", thumbnail: "" });

    useEffect(() => {
        setIsAdmin(localStorage.getItem("isAdmin") === "1");
        setCurrentUserId(getUserIdFromToken());
        fetchData();
    }, []);

    const fetchData = async (filter) => {
        const res = await getBlog(filter);
        if (res.success) {
            setData(
                (res.Items || []).map((item, idx) => ({
                    ...item,
                    key: item.BLOG_ID,
                    STT: idx + 1,
                })),
            );
        }
    };

    const openCreate = () => {
        setForm(emptyForm);
        setShowModal(true);
    };

    const openAutoAdd = () => {
        setAutoForm({ driver_url: "", thumbnail: "", document_url: "" });
        setShowAutoModal(true);
    };

    const handleAutoThumbnailUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            Swal.fire("Lỗi", "Vui lòng chọn file định dạng ảnh", "warning");
            e.target.value = "";
            return;
        }

        try {
            const res = await uploadFile(file);
            if (res?.FilePath) {
                const filePath = res.FilePath.replace(/\\/g, "/");
                setAutoForm((prev) => ({
                    ...prev,
                    thumbnail: filePath.startsWith('https://')
                        ? filePath
                        : `${process.env.NEXT_PUBLIC_API_URL}${filePath}`,
                }));
            }
        } catch {
            Swal.fire("Lỗi", "Không thể tải ảnh lên", "error");
        } finally {
            e.target.value = "";
        }
    };

    const handleAutoSave = async () => {
        if (!autoForm.driver_url?.trim()) {
            Swal.fire("Lỗi", "Vui lòng nhập Link file (driver_url)", "warning");
            return;
        }
        if (!autoForm.thumbnail?.trim()) {
            Swal.fire("Lỗi", "Vui lòng upload Thumbnail", "warning");
            return;
        }

        try {
            Swal.fire({ title: "Đang xử lý...", allowOutsideClick: false });
            Swal.showLoading();

            const response = await fetch(process.env.NEXT_PUBLIC_N8N_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    driver_url: autoForm.driver_url,
                    thumbnail_url: autoForm.thumbnail,
                    user_id: getUserIdFromToken(),
                    document_url: autoForm.document_url || null,
                }),
            });

            if (response.ok) {
                Swal.fire(
                    "Thành công",
                    "Đã thêm bài viết tự động thành công",
                    "success",
                );
                setShowAutoModal(false);
                fetchData();
            } else {
                Swal.fire("Lỗi", "Tạo bài viết tự động thất bại", "error");
            }
        } catch (error) {
            Swal.fire("Lỗi", "Không thể kết nối đến webhook", "error");
        }
    };

    const openEdit = (record) => {
        setForm({
            BLOG_ID: record.BLOG_ID,
            TITLE: record.TITLE || "",
            DESCRIPTION: record.DESCRIPTION || "",
            CONTENT: record.CONTENT || "",
            THUMBNAIL: record.THUMBNAIL || "",
            FILE_URL: record.FILE_URL || "",
            DOCUMENT_URL: record.DOCUMENT_URL || "",
        });
        setShowModal(true);
    };

    const handleThumbnailUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const res = await uploadFile(file);
            if (res?.FilePath) {
                const filePath = res.FilePath.replace(/\\/g, "/");
                setForm((prev) => ({
                    ...prev,
                    THUMBNAIL: filePath.startsWith('https://')
                        ? filePath
                        : `${process.env.NEXT_PUBLIC_API_URL}${filePath}`,
                }));
            }
        } catch {
            Swal.fire("Lỗi", "Không thể tải ảnh lên", "error");
        }
    };

    const handleSave = async () => {
        if (!form.TITLE?.trim()) {
            Swal.fire("Lỗi", "Vui lòng nhập tiêu đề", "warning");
            return;
        }
        const res = await saveBlog(form);
        if (res.success) {
            setShowModal(false);
            fetchData();
        }
    };

    const handleDelete = async (record) => {
        const confirm = await Swal.fire({
            title: "Xác nhận xóa",
            text: `Xóa bài viết "${record.TITLE}"?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Xóa",
            cancelButtonText: "Hủy",
        });
        if (!confirm.isConfirmed) return;
        const res = await deleteBlogById(record.BLOG_ID);
        if (res.success) fetchData();
    };

    const handleDeleteSelected = async () => {
        if (!selectedRows.length) return;
        const confirm = await Swal.fire({
            title: "Xác nhận xóa",
            text: `Xóa ${selectedRows.length} bài viết đã chọn?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Xóa",
            cancelButtonText: "Hủy",
        });
        if (!confirm.isConfirmed) return;
        for (const row of selectedRows) await deleteBlogById(row.BLOG_ID);
        setSelectedRows([]);
        fetchData();
    };

    const isOwner = (record) => record.CREATE_BY === currentUserId;
    const canEdit = (record) => isAdmin || isOwner(record);
    const canDelete = (record) => isAdmin || isOwner(record);

    const columns = [
        { title: "STT", dataIndex: "STT", width: 60 },
        { title: "Tiêu đề", dataIndex: "TITLE" },
        {
            title: "Người đăng",
            dataIndex: "AUTHOR_NAME",
            width: 200,
            render: (val) => val || "—",
        },
        {
            title: "Ngày đăng",
            dataIndex: "CREATED_DATE",
            width: 180,
            render: (text) => {
                if (!text) return "—";
                try {
                    return FormatDateTime(new Date(text));
                } catch {
                    return text;
                }
            },
        },
        {
            title: "Chức năng",
            width: 180,
            render: (_, record) => (
                <Radio.Group>
                    {canEdit(record) ? (
                        <Radio.Button onClick={() => openEdit(record)}>
                            Sửa
                        </Radio.Button>
                    ) : (
                        <Tooltip title="Bạn chỉ có thể sửa bài viết của mình">
                            <Radio.Button disabled>Sửa</Radio.Button>
                        </Tooltip>
                    )}
                    {canDelete(record) ? (
                        <Radio.Button
                            danger
                            onClick={() => handleDelete(record)}
                        >
                            Xóa
                        </Radio.Button>
                    ) : (
                        <Tooltip title="Bạn chỉ có thể xóa bài viết của mình">
                            <Radio.Button disabled>Xóa</Radio.Button>
                        </Tooltip>
                    )}
                </Radio.Group>
            ),
        },
    ];

    const statsData = useMemo(() => {
        const map = {};
        data.forEach((blog) => {
            const key = blog.CREATE_BY || "unknown";
            if (!map[key])
                map[key] = {
                    key,
                    AUTHOR_NAME: blog.AUTHOR_NAME || key,
                    POST_COUNT: 0,
                    DATES: [],
                };
            map[key].POST_COUNT += 1;
            if (blog.CREATED_DATE) map[key].DATES.push(blog.CREATED_DATE);
        });
        return Object.values(map).map((s, idx) => ({
            ...s,
            STT: idx + 1,
            LATEST_DATE: s.DATES.length
                ? s.DATES.sort((a, b) => new Date(b) - new Date(a))[0]
                : null,
        }));
    }, [data]);

    const statsColumns = [
        { title: "STT", dataIndex: "STT", width: 60 },
        { title: "Người đăng", dataIndex: "AUTHOR_NAME" },
        {
            title: "Số bài viết",
            dataIndex: "POST_COUNT",
            width: 130,
            sorter: (a, b) => a.POST_COUNT - b.POST_COUNT,
            render: (c) => <Tag color="blue">{c} bài</Tag>,
        },
        {
            title: "Bài mới nhất",
            dataIndex: "LATEST_DATE",
            width: 200,
            render: (t) =>
                t
                    ? (() => {
                          try {
                              return FormatDateTime(new Date(t));
                          } catch {
                              return t;
                          }
                      })()
                    : "—",
        },
    ];

    const tabItems = [
        {
            key: "list",
            label: (
                <>
                    <UnorderedListOutlined /> Danh sách bài viết
                </>
            ),
            children: (
                <>
                    <div className="d-flex gap-2 mb-3 pt-3 flex-wrap align-items-center">
                        <Button
                            type="primary"
                            shape="round"
                            icon={<PlusOutlined />}
                            size="large"
                            onClick={openCreate}
                        >
                            Thêm bài viết
                        </Button>
                        <Button
                            type="dashed"
                            shape="round"
                            icon={<RobotOutlined />}
                            size="large"
                            onClick={openAutoAdd}
                        >
                            Thêm bài viết tự động
                        </Button>
                        {isAdmin && selectedRows.length > 0 && (
                            <Button
                                danger
                                shape="round"
                                size="large"
                                onClick={handleDeleteSelected}
                            >
                                Xóa {selectedRows.length} bài đã chọn
                            </Button>
                        )}
                        <Tag
                            color={isAdmin ? "red" : "blue"}
                            style={{
                                height: 40,
                                lineHeight: "38px",
                                fontSize: 14,
                                padding: "0 16px",
                                borderRadius: 20,
                            }}
                        >
                            {isAdmin ? "ADMIN" : "Nhân viên"}
                        </Tag>
                    </div>
                    <div className={`${styles.transparentTable}`}>
                        <Table
                            rowSelection={
                                isAdmin
                                    ? {
                                          onChange: (_, rows) =>
                                              setSelectedRows(rows),
                                          selectedRowKeys: selectedRows.map(
                                              (r) => r.key,
                                          ),
                                      }
                                    : undefined
                            }
                            bordered
                            columns={columns}
                            dataSource={data}
                            className={styles.gridTable}
                            pagination={{
                                showSizeChanger: true,
                                pageSizeOptions: [10, 20, 30],
                            }}
                        />
                    </div>
                </>
            ),
        },
        {
            key: "stats",
            label: (
                <>
                    <BarChartOutlined /> Thống kê người đăng
                </>
            ),
            children: (
                <div className="pt-3">
                    <div className="mb-3">
                        <strong>Tổng số bài viết:</strong>{" "}
                        <Tag color="blue">{data.length} bài</Tag>
                        <strong className="ms-3">Số người đăng:</strong>{" "}
                        <Tag color="purple">{statsData.length} người</Tag>
                    </div>
                    <Table
                        bordered
                        columns={statsColumns}
                        dataSource={statsData}
                        className={styles.gridTable}
                        pagination={false}
                    />
                </div>
            ),
        },
    ];

    return (
        <section>
            <div className="col-md-12 pt-3 px-3">
                <h4 className="fw-bold mb-3">Quản lý bài viết (Blog)</h4>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems}
                    size="large"
                />
            </div>

            <Modal
                title={
                    form.BLOG_ID ? "Chỉnh sửa bài viết" : "Thêm bài viết mới"
                }
                open={showModal}
                onOk={handleSave}
                onCancel={() => setShowModal(false)}
                okText="Lưu"
                cancelText="Hủy"
                width={800}
            >
                <div className="mb-3">
                    <label className="form-label fw-semibold">
                        Tiêu đề <span className="text-danger">*</span>
                    </label>
                    <Input
                        placeholder="Nhập tiêu đề bài viết"
                        value={form.TITLE}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                TITLE: e.target.value,
                            }))
                        }
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label fw-semibold">Thumbnail</label>
                    <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={handleThumbnailUpload}
                    />
                    {form.THUMBNAIL && (
                        <img
                            src={form.THUMBNAIL}
                            alt="thumbnail preview"
                            style={{
                                marginTop: 8,
                                maxHeight: 120,
                                borderRadius: 6,
                                objectFit: "cover",
                            }}
                        />
                    )}
                </div>
                <div className="mb-3">
                    <label className="form-label fw-semibold">Mô tả ngắn</label>
                    <TextArea
                        rows={3}
                        placeholder="Nhập mô tả ngắn"
                        value={form.DESCRIPTION}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                DESCRIPTION: e.target.value,
                            }))
                        }
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label fw-semibold">
                        Trang dowload tài liệu (document_url)
                    </label>
                    <Input
                        placeholder="Nhập link trang detail tài liệu (VD: /document/ten-tai-lieu)"
                        value={form.DOCUMENT_URL}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                DOCUMENT_URL: e.target.value,
                            }))
                        }
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label fw-semibold">
                        Link file preview (file_url)
                    </label>
                    <Input
                        placeholder="Nhập link Google Drive để preview"
                        value={form.FILE_URL}
                        onChange={(e) =>
                            setForm((prev) => ({
                                ...prev,
                                FILE_URL: e.target.value,
                            }))
                        }
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label fw-semibold">Nội dung</label>
                    <ReactQuill
                        value={form.CONTENT}
                        onChange={(val) =>
                            setForm((prev) => ({ ...prev, CONTENT: val }))
                        }
                        style={{ height: 300, marginBottom: 50 }}
                    />
                </div>
            </Modal>

            <Modal
                title="Thêm bài viết tự động"
                open={showAutoModal}
                onOk={handleAutoSave}
                onCancel={() => setShowAutoModal(false)}
                okText="Tạo"
                cancelText="Hủy"
                width={600}
            >
                <div className="mb-3 mt-3">
                    <label className="form-label fw-semibold">
                        Link file (driver_url){" "}
                        <span className="text-danger">*</span>
                    </label>
                    <Input
                        placeholder="Nhập link file Google Drive"
                        value={autoForm.driver_url}
                        onChange={(e) =>
                            setAutoForm((prev) => ({
                                ...prev,
                                driver_url: e.target.value,
                            }))
                        }
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label fw-semibold">
                        Trang dowload tài liệu (document_url)
                    </label>
                    <Input
                        placeholder="Nhập link trang detail tài liệu (VD: /document/ten-tai-lieu)"
                        value={autoForm.document_url}
                        onChange={(e) =>
                            setAutoForm((prev) => ({
                                ...prev,
                                document_url: e.target.value,
                            }))
                        }
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label fw-semibold">
                        Thumbnail <span className="text-danger">*</span>
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={handleAutoThumbnailUpload}
                    />
                    {autoForm.thumbnail && (
                        <img
                            src={autoForm.thumbnail}
                            alt="thumbnail preview"
                            style={{
                                marginTop: 8,
                                maxHeight: 120,
                                borderRadius: 6,
                                objectFit: "cover",
                            }}
                        />
                    )}
                </div>
            </Modal>
        </section>
    );
}
