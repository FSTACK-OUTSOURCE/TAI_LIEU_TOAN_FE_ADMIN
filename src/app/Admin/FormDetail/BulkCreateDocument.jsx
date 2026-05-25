"use client";
import { getClientSideCookie } from "@/app/Api";
import { getDocumentInfo, postDocumentInfo } from "@/app/Api/apiDocument";
import { getTopicInfo } from "@/app/Api/apiTopic";
import { DebounceSelect } from "@/app/Component/DebounceSelect";
import { guidEmpty } from "@/app/constans";
import { DeleteOutlined, InboxOutlined } from "@ant-design/icons";
import {
    Button,
    Checkbox,
    Col,
    Input,
    InputNumber,
    Modal,
    Progress,
    Radio,
    Row,
    Select,
    Table,
    Upload,
    notification,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import styles from "../../page.module.css";

const { Dragger } = Upload;

const FILE_TYPE_MAP = {
    ".doc": "doc",
    ".docx": "docx",
    ".pdf": "pdf",
    ".xlsx": "xlsx",
    ".xls": "xls",
    ".ppt": "ppt",
    ".pptx": "pptx",
    ".rar": "rar",
    ".zip": "zip",
};

const DOWNLOAD_EXTENSIONS = [".doc", ".docx", ".rar", ".zip", ".xlsx", ".xls", ".ppt", ".pptx"];

const STATUS_FLAGS = {
    published: { IS_FOLDER: false, IS_PUBLIC: true, IS_PIN: false, IS_HIDDEN: false },
    folder: { IS_FOLDER: true, IS_PUBLIC: false, IS_PIN: false, IS_HIDDEN: false },
    featured: { IS_FOLDER: false, IS_PUBLIC: true, IS_PIN: true, IS_HIDDEN: false },
    hidden: { IS_FOLDER: false, IS_PUBLIC: false, IS_PIN: false, IS_HIDDEN: true },
};

const getUserIdFromToken = () => {
    try {
        const token = getClientSideCookie("token");
        if (!token) return null;
        return JSON.parse(atob(token.split(".")[1]))?.UserId ?? null;
    } catch {
        return null;
    }
};

const getExtension = (fileName = "") => fileName.match(/\.[^.]+$/)?.[0]?.toLowerCase() || "";

const getBaseName = (fileName = "") => {
    const ext = getExtension(fileName);
    return ext ? fileName.slice(0, -ext.length) : fileName;
};

const getRelativePath = (file) => file.webkitRelativePath || file.name;

const getFileMeta = (file) => {
    const relativePath = getRelativePath(file);
    const parts = relativePath.split("/");
    return {
        baseName: getBaseName(file.name),
        directory: parts.length > 1 ? parts.slice(0, -1).join("/") : "",
        ext: getExtension(file.name),
    };
};

const getGroupKey = (file, directoryStats) => {
    const { baseName, directory } = getFileMeta(file);
    if (!directory) return baseName;

    const stats = directoryStats.get(directory);
    if (stats && (stats.pdfCount > 1 || stats.downloadCount > 1)) {
        return `${directory}/${baseName}`;
    }

    return directory;
};

const normalizeUploadFile = (uploadFile) => uploadFile.originFileObj || uploadFile;

const buildRowsFromFiles = (uploadFiles, defaults) => {
    const grouped = new Map();
    const directoryStats = new Map();
    const files = uploadFiles
        .map(normalizeUploadFile)
        .filter((file) => {
            const ext = getExtension(file.name);
            return ext === ".pdf" || DOWNLOAD_EXTENSIONS.includes(ext);
        });

    files.forEach((file) => {
        const { directory, ext } = getFileMeta(file);
        if (!directory) return;
        const stats = directoryStats.get(directory) || { pdfCount: 0, downloadCount: 0 };
        if (ext === ".pdf") stats.pdfCount += 1;
        if (DOWNLOAD_EXTENSIONS.includes(ext)) stats.downloadCount += 1;
        directoryStats.set(directory, stats);
    });

    files.forEach((file) => {
        const ext = getExtension(file.name);
        const groupKey = getGroupKey(file, directoryStats);
        const current = grouped.get(groupKey) || {
            key: groupKey,
            name: groupKey.split("/").pop() || getBaseName(file.name),
            folderPath: groupKey,
            pdfFile: null,
            downloadFile: null,
            usePreview: false,
            useDownload: false,
            fileType: defaults.FILE_TYPE || null,
            price: defaults.PRICE || null,
            orderNo: null,
            status: "ready",
        };

        if (ext === ".pdf") {
            current.pdfFile = file;
            current.usePreview = true;
            current.name = current.name || getBaseName(file.name);
        } else if (DOWNLOAD_EXTENSIONS.includes(ext)) {
            current.downloadFile = file;
            current.useDownload = true;
            current.fileType = FILE_TYPE_MAP[ext] || current.fileType;
            current.name = current.name || getBaseName(file.name);
        }

        current.status = current.pdfFile || current.downloadFile ? "ready" : "invalid";
        grouped.set(groupKey, current);
    });

    return Array.from(grouped.values()).map((row, index) => ({
        ...row,
        orderNo: row.orderNo ?? index + 1,
    }));
};

const toSingleUploadFile = (file) => ({
    uid: `${file.name}-${file.lastModified || Date.now()}`,
    name: file.name,
    status: "done",
    originFileObj: file,
});

const BulkCreateDocument = ({ onClose, parentDocumentId }) => {
    const [selectedParentId, setSelectedParentId] = useState(parentDocumentId || guidEmpty);
    const [parentOptions, setParentOptions] = useState([]);
    const [parentLoading, setParentLoading] = useState(false);
    const [defaults, setDefaults] = useState({
        PRICE: null,
        GRADE: "",
        SUBJECT: "",
        CATEGORY: "single",
        FILE_TYPE: null,
        TOPIC_IDS: null,
    });
    const [status, setStatus] = useState("published");
    const [createBlog, setCreateBlog] = useState(false);
    const [rows, setRows] = useState([]);
    const [running, setRunning] = useState(false);

    const validRows = useMemo(
        () => rows.filter((row) => row.pdfFile || row.downloadFile),
        [rows],
    );

    const applyParentDefaults = (parent, force = false) => {
        if (!parent) return;
        setDefaults((prev) => ({
            ...prev,
            PRICE: force || prev.PRICE == null ? parent.PRICE ?? prev.PRICE : prev.PRICE,
            GRADE: force || !prev.GRADE ? parent.GRADE || prev.GRADE : prev.GRADE,
            SUBJECT: force || !prev.SUBJECT ? parent.SUBJECT || prev.SUBJECT : prev.SUBJECT,
            CATEGORY: force || !prev.CATEGORY ? parent.CATEGORY || prev.CATEGORY : prev.CATEGORY,
            FILE_TYPE: force || !prev.FILE_TYPE ? parent.FILE_TYPE || prev.FILE_TYPE : prev.FILE_TYPE,
            TOPIC_IDS: force || !prev.TOPIC_IDS ? parent.TOPIC_IDS || prev.TOPIC_IDS : prev.TOPIC_IDS,
        }));
        setRows((prevRows) =>
            prevRows.map((row) => ({
                ...row,
                price: row.price ?? parent.PRICE ?? null,
                fileType: row.fileType || parent.FILE_TYPE || null,
            })),
        );
    };

    const GetTopics = async (ids, key) => {
        const response = await getTopicInfo({ NAME: key, TOPIC_IDS: ids }, false);
        if (response.success && response.Items) {
            return response.Items.map((x) => ({ label: x.NAME, value: x.TOPIC_ID, ...x }));
        }
        return [];
    };

    const toParentOption = (document) => ({
        value: document.DOCUMENT_ID,
        label: document.IDENTITY_KEY ? `${document.NAME} - ${document.IDENTITY_KEY}` : document.NAME,
    });

    const mergeParentOptions = (currentOptions, newOptions) => {
        const map = new Map();
        [...(currentOptions || []), ...(newOptions || [])].forEach((option) => {
            if (option?.value) map.set(option.value, option);
        });
        return Array.from(map.values());
    };

    const fetchParentOptions = async (search, selectedOption) => {
        setParentLoading(true);
        try {
            const keyword = search?.trim();
            const response = await getDocumentInfo(
                {
                    ...(keyword
                        ? isNaN(keyword)
                            ? { NAME: keyword }
                            : { IDENTITY_KEY: keyword }
                        : {}),
                    Columns: "*",
                    IS_FOLDER: true,
                    CurrentPage: 1,
                    PageSize: 10000,
                },
                false,
            );
            const apiOptions = (response.Items || []).map(toParentOption);
            setParentOptions((prev) =>
                mergeParentOptions(selectedOption ? [selectedOption] : prev, apiOptions),
            );
        } finally {
            setParentLoading(false);
        }
    };

    const handleParentChange = async (value) => {
        const nextParentId = value || guidEmpty;
        setSelectedParentId(nextParentId);
        if (nextParentId === guidEmpty) return;

        const response = await getDocumentInfo({ DOCUMENT_ID: nextParentId, Columns: "*" }, false);
        if (response.success && response.Items?.length > 0) {
            applyParentDefaults(response.Items[0]);
        }
    };

    useEffect(() => {
        if (parentDocumentId && parentDocumentId !== guidEmpty) {
            getDocumentInfo({ DOCUMENT_ID: parentDocumentId, Columns: "*" }, false).then((response) => {
                if (response.success && response.Items?.length > 0) {
                    const parent = response.Items[0];
                    fetchParentOptions(null, toParentOption(parent));
                    applyParentDefaults(parent, true);
                } else {
                    fetchParentOptions();
                }
            });
        } else {
            fetchParentOptions();
        }
    }, [parentDocumentId]);

    const updateRow = (key, patch) => {
        setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    };

    const removeRow = (key) => {
        setRows((prev) => prev.filter((row) => row.key !== key));
    };

    const handleReplacePreview = (row, file) => {
        const uploadFile = normalizeUploadFile(file);
        updateRow(row.key, {
            pdfFile: uploadFile,
            usePreview: true,
            name: row.name || getBaseName(uploadFile.name),
        });
        return false;
    };

    const handleReplaceDownload = (row, file) => {
        const uploadFile = normalizeUploadFile(file);
        const ext = getExtension(uploadFile.name);
        updateRow(row.key, {
            downloadFile: uploadFile,
            useDownload: true,
            fileType: FILE_TYPE_MAP[ext] || row.fileType,
            name: row.name || getBaseName(uploadFile.name),
        });
        return false;
    };

    const showBulkProgress = (key, percent, description, progressStatus = "active", duration = 0) => {
        notification.open({
            key,
            message: "Đăng bài hàng loạt",
            description: (
                <div>
                    <div style={{ marginBottom: 8 }}>{description}</div>
                    <Progress percent={percent} status={progressStatus} size="small" />
                </div>
            ),
            duration,
            placement: "bottomRight",
        });
    };

    const callAutomation = async (documentResponse, row, isCreateBlog) => {
        const pdfFile = row.usePreview ? row.pdfFile : null;
        if (!pdfFile) return;

        const webhookFormData = new FormData();
        const userId = getUserIdFromToken();
        if (userId) webhookFormData.append("USER_ID", userId);

        const linkPreview = documentResponse?.LINK_PREVIEW || "";
        webhookFormData.append("DOCUMENT_PDF", pdfFile);
        if (linkPreview) webhookFormData.append("LINK_PREVIEW", linkPreview);
        webhookFormData.append("DOCUMENT_ID", documentResponse?.DOCUMENT_ID || "");
        webhookFormData.append("DOCUMENT_TITLE", documentResponse?.NAME || row.name || "");
        webhookFormData.append("IS_CREATE_BLOG", isCreateBlog ? "true" : "false");
        webhookFormData.append("THUMBNAIL_URL", documentResponse?.IMAGE_LINK || "");
        webhookFormData.append("IS_CREATE_NEW", "true");

        if (isCreateBlog) {
            webhookFormData.append(
                "DOCUMENT_URL",
                `https://tailieutoan.vn/${documentResponse?.NAME_SLUG || ""}-${documentResponse?.IDENTITY_KEY || ""}`,
            );
        }

        const webhookResponse = await fetch(process.env.NEXT_PUBLIC_N8N_QUICK_DOCUMENT_CHILD, {
            method: "POST",
            body: webhookFormData,
        });
        if (!webhookResponse.ok) {
            throw new Error(`Webhook failed with status ${webhookResponse.status}`);
        }
    };

    const startBulkCreate = async () => {
        if (!validRows.length) {
            notification.warning({
                message: "Đăng bài hàng loạt",
                description: "Chưa có tài liệu hợp lệ để đăng.",
                placement: "bottomRight",
            });
            return;
        }

        setRunning(true);
        const jobKey = `bulk-document-${Date.now()}`;
        const flags = STATUS_FLAGS[status];
        showBulkProgress(jobKey, 3, `Bắt đầu tạo ${validRows.length} tài liệu...`);
        onClose();

        let successCount = 0;
        let failCount = 0;
        let skippedAutomationCount = 0;

        for (let index = 0; index < validRows.length; index += 1) {
            const row = validRows[index];
            const basePercent = Math.round((index / validRows.length) * 90) + 5;
            try {
                showBulkProgress(jobKey, basePercent, `Đang lưu ${index + 1}/${validRows.length}: ${row.name}`);

                const formData = new FormData();
                if (row.useDownload && row.downloadFile) formData.append("FILE", row.downloadFile);
                if (row.usePreview && row.pdfFile) formData.append("FILE_PDF", row.pdfFile);

                const saveData = {
                    NAME: row.name,
                    PRICE: row.price ?? defaults.PRICE,
                    ORDER_NO: row.orderNo,
                    GRADE: defaults.GRADE || undefined,
                    SUBJECT: defaults.SUBJECT || undefined,
                    CATEGORY: defaults.CATEGORY || "single",
                    FILE_TYPE: row.fileType || defaults.FILE_TYPE,
                    TOPIC_IDS: defaults.TOPIC_IDS || undefined,
                    ...flags,
                };

                Object.keys(saveData).forEach((field) => {
                    if (saveData[field] != null && saveData[field] !== "") {
                        formData.append(field, saveData[field]);
                    }
                });

                if (selectedParentId && selectedParentId !== guidEmpty) {
                    formData.append("PARENT_DOCUMENT_ID", selectedParentId);
                }

                const response = await postDocumentInfo(formData, false, null);
                if (!response?.DOCUMENT_ID) {
                    throw new Error("Save document failed");
                }

                if (row.usePreview && row.pdfFile) {
                    showBulkProgress(jobKey, basePercent + 3, `Đã lưu ${row.name}. Đang gửi n8n xử lý nền...`);
                    await callAutomation(response, row, createBlog);
                } else {
                    skippedAutomationCount += 1;
                }
                successCount += 1;
            } catch (error) {
                failCount += 1;
                console.warn("Bulk create item failed:", row, error);
            }
        }

        const doneStatus = failCount > 0 ? "exception" : "success";
        showBulkProgress(
            jobKey,
            100,
            `Hoàn tất: ${successCount} thành công, ${failCount} lỗi${skippedAutomationCount ? `, ${skippedAutomationCount} không gửi n8n vì chưa có file preview` : ""}.`,
            doneStatus,
            failCount > 0 ? 0 : 5,
        );
    };

    const columns = [
        {
            title: "Tên tài liệu",
            dataIndex: "name",
            render: (_, row) => (
                <Input value={row.name} onChange={(e) => updateRow(row.key, { name: e.target.value })} />
            ),
        },
        {
            title: "PDF",
            width: 220,
            render: (_, row) => (
                <div>
                    <Checkbox
                        checked={row.usePreview}
                        disabled={!row.pdfFile}
                        onChange={(e) => updateRow(row.key, { usePreview: e.target.checked })}
                    >
                        File preview
                    </Checkbox>
                    <div className={styles.bulkFileName}>{row.pdfFile?.name || "Chưa có"}</div>
                    <Upload
                        beforeUpload={(file) => handleReplacePreview(row, file)}
                        showUploadList={false}
                        accept=".pdf"
                        maxCount={1}
                    >
                        <Button size="small" className={styles.bulkReplaceButton}>
                            {row.pdfFile ? "Thay file" : "Upload"}
                        </Button>
                    </Upload>
                </div>
            ),
        },
        {
            title: "File tải",
            width: 220,
            render: (_, row) => (
                <div>
                    <Checkbox
                        checked={row.useDownload}
                        disabled={!row.downloadFile}
                        onChange={(e) => updateRow(row.key, { useDownload: e.target.checked })}
                    >
                        File tải
                    </Checkbox>
                    <div className={styles.bulkFileName}>{row.downloadFile?.name || "Chưa có"}</div>
                    <Upload
                        beforeUpload={(file) => handleReplaceDownload(row, file)}
                        showUploadList={false}
                        accept=".doc,.docx,.rar,.zip,.xlsx,.xls,.ppt,.pptx"
                        maxCount={1}
                    >
                        <Button size="small" className={styles.bulkReplaceButton}>
                            {row.downloadFile ? "Thay file" : "Upload"}
                        </Button>
                    </Upload>
                </div>
            ),
        },
        {
            title: "Giá",
            width: 130,
            render: (_, row) => (
                <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    value={row.price}
                    onChange={(value) => updateRow(row.key, { price: value })}
                />
            ),
        },
        {
            title: "Thứ tự",
            width: 100,
            render: (_, row) => (
                <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    value={row.orderNo}
                    onChange={(value) => updateRow(row.key, { orderNo: value })}
                />
            ),
        },
        {
            title: "",
            width: 64,
            fixed: "right",
            render: (_, row) => (
                <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeRow(row.key)}
                />
            ),
        },
    ];

    return (
        <Modal
            open={true}
            title="Đăng bài hàng loạt"
            onCancel={onClose}
            width={1180}
            centered
            className={styles.documentDetailModal}
            styles={{ body: { maxHeight: "calc(100vh - 190px)", overflowY: "auto" } }}
            footer={[
                <Button key="close" onClick={onClose} disabled={running}>
                    Đóng
                </Button>,
                <Button key="save" type="primary" onClick={startBulkCreate} disabled={!validRows.length} loading={running}>
                    Đăng {validRows.length || ""} tài liệu
                </Button>,
            ]}
        >
            <div className={`${styles.documentForm} ${styles.quickCreateForm}`}>
                <Row gutter={16}>
                    <Col span={24}>
                        <span className={styles.quickFieldLabel}>Tài liệu cha</span>
                        <Select
                            showSearch
                            allowClear
                            value={selectedParentId === guidEmpty ? undefined : selectedParentId}
                            placeholder="Chọn tài liệu cha"
                            loading={parentLoading}
                            filterOption={false}
                            onSearch={fetchParentOptions}
                            onChange={handleParentChange}
                            options={parentOptions}
                            style={{ width: "100%" }}
                        />
                    </Col>
                </Row>
                <div style={{ height: 16 }} />
                <Row gutter={16}>
                    <Col span={6}>
                        <span className={styles.quickFieldLabel}>Giá mặc định</span>
                        <InputNumber
                            min={0}
                            style={{ width: "100%" }}
                            value={defaults.PRICE}
                            onChange={(value) => setDefaults((prev) => ({ ...prev, PRICE: value }))}
                        />
                    </Col>
                    <Col span={6}>
                        <span className={styles.quickFieldLabel}>Lớp</span>
                        <Input
                            value={defaults.GRADE}
                            placeholder="vd: Lớp 12"
                            onChange={(e) => setDefaults((prev) => ({ ...prev, GRADE: e.target.value }))}
                        />
                    </Col>
                    <Col span={6}>
                        <span className={styles.quickFieldLabel}>Môn học</span>
                        <Input
                            value={defaults.SUBJECT}
                            placeholder="vd: Toán"
                            onChange={(e) => setDefaults((prev) => ({ ...prev, SUBJECT: e.target.value }))}
                        />
                    </Col>
                    <Col span={6}>
                        <span className={styles.quickFieldLabel}>Loại tài liệu</span>
                        <Select
                            style={{ width: "100%" }}
                            value={defaults.CATEGORY}
                            onChange={(value) => setDefaults((prev) => ({ ...prev, CATEGORY: value }))}
                            options={[
                                { value: "single", label: "Tài liệu lẻ" },
                                { value: "bundle", label: "Tài liệu bộ" },
                            ]}
                        />
                    </Col>
                </Row>

                <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={8}>
                        <span className={styles.quickFieldLabel}>Định dạng mặc định</span>
                        <Select
                            style={{ width: "100%" }}
                            value={defaults.FILE_TYPE}
                            allowClear
                            placeholder="-- Chọn --"
                            onChange={(value) => setDefaults((prev) => ({ ...prev, FILE_TYPE: value || null }))}
                            options={Object.values(FILE_TYPE_MAP).map((value) => ({ value, label: value.toUpperCase() }))}
                        />
                    </Col>
                    <Col span={10}>
                        <span className={styles.quickFieldLabel}>Chủ đề</span>
                        <DebounceSelect
                            mode="multiple"
                            initialValues={defaults.TOPIC_IDS}
                            size="large"
                            placeholder="-- Chọn chủ đề --"
                            fetchOptions={GetTopics}
                            onChange={(value) =>
                                setDefaults((prev) => ({
                                    ...prev,
                                    TOPIC_IDS: value === "" ? null : value.map((x) => x.value)?.join(","),
                                }))
                            }
                            style={{ width: "100%" }}
                        />
                    </Col>
                    <Col span={6}>
                        <span className={styles.quickFieldLabel}>Trạng thái</span>
                        <Radio.Group
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            optionType="button"
                            buttonStyle="solid"
                        >
                            <Radio.Button value="published">Phát hành</Radio.Button>
                            <Radio.Button value="hidden">Ẩn</Radio.Button>
                        </Radio.Group>
                    </Col>
                </Row>

                <div className={styles.bulkUploadBox}>
                    <Dragger
                        multiple
                        directory
                        beforeUpload={() => false}
                        showUploadList={false}
                        accept=".pdf,.doc,.docx,.rar,.zip,.xlsx,.xls,.ppt,.pptx"
                        onChange={({ fileList }) => setRows(buildRowsFromFiles(fileList, defaults))}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">Chọn hoặc kéo thả folder/file tài liệu vào đây</p>
                        <p className="ant-upload-hint">
                            Tool tự ghép file PDF với file Word/Zip/Rar theo cùng folder hoặc cùng tên file.
                        </p>
                    </Dragger>
                </div>

                <div className={styles.bulkToolbar}>
                    <span>{rows.length} nhóm file, {validRows.length} hợp lệ</span>
                    <Checkbox checked={createBlog} onChange={(e) => setCreateBlog(e.target.checked)}>
                        Tạo blog nếu đủ dữ liệu
                    </Checkbox>
                </div>

                <Table
                    rowKey="key"
                    size="small"
                    bordered
                    columns={columns}
                    dataSource={rows}
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 900 }}
                />
            </div>
        </Modal>
    );
};

export default BulkCreateDocument;
