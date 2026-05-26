"use client";
import { getClientSideCookie } from "@/app/Api";
import { getDocumentInfo, postDocumentInfo } from "@/app/Api/apiDocument";
import { getFiles } from "@/app/Api/apiFile";
import { getTopicInfo } from "@/app/Api/apiTopic";
import { DebounceSelect } from "@/app/component/DebounceSelect";
import { ReactQuill } from "@/app/component/TextEditor";
import { guidEmpty } from "@/app/constans";
import { finishBackgroundJob, startBackgroundJob, updateBackgroundJob } from "@/app/utils/backgroundJobs";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Checkbox, Col, Divider, Image, Input, InputNumber, Modal, Radio, Row, Select, Upload, notification } from "antd";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState } from "react";
import styles from "../../../page.module.css";
const { TextArea } = Input;

const FILE_TYPE_MAP = {
    ".doc": "doc", ".docx": "docx", ".pdf": "pdf",
    ".xlsx": "xlsx", ".xls": "xls", ".ppt": "ppt",
    ".pptx": "pptx", ".rar": "rar", ".zip": "zip",
};

const STATUS_FLAGS = {
    published: { IS_FOLDER: false, IS_PUBLIC: true, IS_PIN: false, IS_HIDDEN: false },
    folder: { IS_FOLDER: true, IS_PUBLIC: false, IS_PIN: false, IS_HIDDEN: false },
    featured: { IS_FOLDER: false, IS_PUBLIC: true, IS_PIN: true, IS_HIDDEN: false },
    hidden: { IS_FOLDER: false, IS_PUBLIC: false, IS_PIN: false, IS_HIDDEN: true },
};

const QuickCreateDocument = ({ onClose, parentDocumentId, documentId }) => {
    const [data, setData] = useState({ CATEGORY: "single" });
    const [quill, setQuill] = useState("");
    const [file, setFile] = useState(null);
    const [fileUploadPdf, setFileUploadPdf] = useState(null);
    const [fileDoc, setFileDoc] = useState([]);
    const [filePdf, setFilePdf] = useState([]);
    const [fileImage, setFileImage] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [isImageModalVisible, setIsImageModalVisible] = useState(false);
    const [createBlog, setCreateBlog] = useState(false);
    const [status, setStatus] = useState("published");
    const [loading, setLoading] = useState(false);

    const getUserIdFromToken = () => {
        try {
            const token = getClientSideCookie("token");
            if (!token) return null;
            return JSON.parse(atob(token.split(".")[1]))?.UserId ?? null;
        } catch {
            return null;
        }
    };

    const GetTopics = async (ids, key) => {
        const response = await getTopicInfo({ NAME: key, TOPIC_IDS: ids }, false);
        if (response.success && response.Items) {
            return response.Items.map((x) => ({ label: x.NAME, value: x.TOPIC_ID, ...x }));
        }
        return [];
    };

    const GetData = async (docId) => {
        const res = await getDocumentInfo({ DOCUMENT_ID: docId, Columns: "EMAILS" });
        if (res.success && res.Items?.length > 0) {
            const doc = res.Items[0];
            const extWithDot = doc.FILE_EXTENSION?.toLowerCase() || "";
            setData({ ...doc, FILE_TYPE: doc.FILE_TYPE || FILE_TYPE_MAP[extWithDot] || null });
            setQuill(doc.DESCRIPTION || "");
            if (doc.IS_FOLDER) setStatus("folder");
            else if (doc.IS_HIDDEN) setStatus("hidden");
            else if (doc.IS_PIN) setStatus("featured");
            else setStatus("published");
            if (doc.IMAGE_LINK) {
                setFileImage([{ uid: doc.DOCUMENT_ID, name: "image.png", status: "done", url: `${process.env.NEXT_PUBLIC_API_URL}${doc.IMAGE_LINK}` }]);
            }
            if (doc.FILE_KEY) {
                setFileDoc([{ uid: doc.FILE_KEY, id: doc.FILE_KEY, name: `${doc.NAME}${doc.FILE_EXTENSION || ""}`, status: "done" }]);
            }
            if (doc.PDF_KEY) {
                setFilePdf([{ uid: doc.PDF_KEY, id: doc.PDF_KEY, name: `${doc.NAME}${doc.PDF_EXTENSION || ""}`, status: "done" }]);
            }
            const parentId = doc.PARENT_DOCUMENT_ID;
            if ((!doc.GRADE || !doc.SUBJECT) && parentId && parentId !== guidEmpty) {
                getDocumentInfo({ DOCUMENT_ID: parentId, Columns: "*" }, false).then((parentRes) => {
                    if (parentRes.success && parentRes.Items?.length > 0) {
                        const parent = parentRes.Items[0];
                        setData((prev) => ({
                            ...prev,
                            GRADE: prev.GRADE || parent.GRADE || undefined,
                            SUBJECT: prev.SUBJECT || parent.SUBJECT || undefined,
                        }));
                    }
                });
            }
        }
    };

    useEffect(() => {
        if (documentId) {
            GetData(documentId);
        } else if (parentDocumentId && parentDocumentId !== guidEmpty) {
            getDocumentInfo({ DOCUMENT_ID: parentDocumentId, Columns: "*" }, false).then((res) => {
                if (res.success && res.Items?.length > 0) {
                    const parent = res.Items[0];
                    setData((prev) => ({
                        ...prev,
                        GRADE: prev.GRADE || parent.GRADE || undefined,
                        SUBJECT: prev.SUBJECT || parent.SUBJECT || undefined,
                    }));
                }
            });
        }
        getFiles().then((res) => {
            if (res.success) setExistingImages(res.Data);
        });
    }, [documentId]);

    const handleFileChange = ({ fileList }) => {
        if (!fileList.length) {
            setFile(null);
            setFileDoc([]);
            return;
        }
        const latest = fileList[fileList.length - 1];
        setFile(latest);
        setFileDoc([latest]);
        if (latest.name) {
            const ext = latest.name.match(/\.[^.]+$/)?.[0]?.toLowerCase() || "";
            setData((prev) => ({
                ...prev,
                FILE_TYPE: FILE_TYPE_MAP[ext] || prev.FILE_TYPE || null,
            }));
        }
    };

    const handleFilePdfChange = ({ fileList }) => {
        if (!fileList.length) {
            setFilePdf([]);
            setFileUploadPdf(null);
            return;
        }
        const latest = fileList[fileList.length - 1];
        setFilePdf([latest]);
        setFileUploadPdf(latest);
        if (latest.name) {
            const ext = latest.name.match(/\.[^.]+$/)?.[0]?.toLowerCase() || "";
            const nameWithoutExt = ext ? latest.name.slice(0, -ext.length) : latest.name;
            setData((prev) => ({ ...prev, NAME: nameWithoutExt }));
        }
    };

    const uploadFile = async ({ file, onSuccess, onError }) => {
        const formData = new FormData();
        formData.append("file", file);
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/file/upload`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${getClientSideCookie("token")}`,
                        "Content-Type": "multipart/form-data",
                    },
                },
            );
            onSuccess(response.data);
        } catch (err) {
            onError(err);
        }
    };

    const handleSelectImage = (image) => {
        setFileImage([{
            uid: "selected",
            name: "image.png",
            status: "done",
            url: `${process.env.NEXT_PUBLIC_API_URL}${image}`,
        }]);
        setData((prev) => ({ ...prev, IMAGE_LINK: image }));
        setIsImageModalVisible(false);
    };

    const onSave = async () => {
        setLoading(true);
        const jobKey = `quick-document-${Date.now()}`;
        startBackgroundJob({
            id: jobKey,
            title: "Tạo tài liệu tự động",
            description: "Đang lưu tài liệu...",
            percent: 10,
        });
        const formData = new FormData();
        if (file) formData.append("FILE", file);
        if (fileUploadPdf) formData.append("FILE_PDF", fileUploadPdf);

        const flags = STATUS_FLAGS[status];
        const saveData = { ...data, DESCRIPTION: quill, ...flags };

        Object.keys(saveData).forEach((key) => {
            if (saveData[key] != null) formData.append(key, saveData[key]);
        });

        if (parentDocumentId && parentDocumentId !== guidEmpty) {
            formData.append("PARENT_DOCUMENT_ID", parentDocumentId);
        }

        const response = await postDocumentInfo(formData);
        const pdfFile = fileUploadPdf?.originFileObj ?? fileUploadPdf;
        if (response?.DOCUMENT_ID && pdfFile && (!documentId || createBlog)) {
            updateBackgroundJob(jobKey, {
                percent: 40,
                description: "Đã lưu tài liệu. Đang chuẩn bị gửi sang hệ thống tự động...",
            });
            onClose();
            try {
                const webhookFormData = new FormData();
                const userId = getUserIdFromToken();
                if (userId) webhookFormData.append("USER_ID", userId);
                const linkPreview = response?.LINK_PREVIEW || "";
                const isCreateBlog = createBlog && response.IMAGE_LINK && userId && pdfFile && response.NAME_SLUG;
                webhookFormData.append("DOCUMENT_PDF", pdfFile);
                if (linkPreview) webhookFormData.append("LINK_PREVIEW", linkPreview);
                webhookFormData.append("DOCUMENT_ID", response?.DOCUMENT_ID || "");
                webhookFormData.append("DOCUMENT_TITLE", response?.NAME || "");
                webhookFormData.append("IS_CREATE_BLOG", isCreateBlog ? "true" : "false");
                webhookFormData.append("THUMBNAIL_URL", response.IMAGE_LINK || "");
                webhookFormData.append("IS_CREATE_NEW", Boolean(documentId) ? "false" : "true");
                if(isCreateBlog){
                    webhookFormData.append("DOCUMENT_URL", `https://tailieutoan.vn/${response?.NAME_SLUG || ""}-${response?.IDENTITY_KEY || ""}`);
                }

                updateBackgroundJob(jobKey, {
                    percent: 70,
                    description: "Đang tạo tài liệu tự động trong nền. Bạn có thể tiếp tục làm việc khác.",
                });
                const webhookResponse = await fetch(process.env.NEXT_PUBLIC_N8N_QUICK_DOCUMENT_CHILD, {
                    method: "POST",
                    body: webhookFormData,
                });
                if (!webhookResponse.ok) {
                    throw new Error(`Webhook failed with status ${webhookResponse.status}`);
                }
                finishBackgroundJob(jobKey, {
                    percent: 100,
                    status: "success",
                    description: "Hoàn tất gửi yêu cầu tạo tài liệu tự động.",
                });
            } catch(error) {
                console.warn("Webhook call failed:", error);
                finishBackgroundJob(jobKey, {
                    percent: 100,
                    status: "exception",
                    description: "Tài liệu đã lưu, nhưng gửi yêu cầu tạo tự động thất bại. Vui lòng thử lại hoặc kiểm tra n8n.",
                });
            }
        } else {
            finishBackgroundJob(jobKey, {
                percent: 100,
                status: "success",
                description: "Đã lưu tài liệu thành công.",
            });
            notification.success({
                message: "Tạo tài liệu tự động",
                description: "Đã lưu tài liệu thành công.",
                placement: "bottomRight",
            });
            setLoading(false);
            onClose();
        }
    };

    const fieldLabel = (text) => (
        <span className={styles.quickFieldLabel}>{text}</span>
    );

    return (
        <>
        <Modal
            open={true}
            title={documentId ? "Cập nhật tài liệu tự động" : "Tạo tài liệu tự động"}
            onCancel={onClose}
            width={1120}
            centered
            className={styles.documentDetailModal}
            styles={{ body: { maxHeight: "calc(100vh - 190px)", overflowY: "auto" } }}
            footer={
                <div className={styles.quickFooter}>
                    <Button onClick={onClose} disabled={loading}>Đóng</Button>
                    <Button type="primary" loading={loading} onClick={onSave}>Lưu</Button>
                </div>
            }
        >
            <div className={`${styles.documentForm} ${styles.quickCreateForm}`}>
            {/* Upload files */}
            <Divider orientation="left" orientationMargin={0}>Tài liệu nguồn</Divider>
            <Row gutter={16}>
                <Col span={12}>
                    <div style={{ marginBottom: 16 }}>
                        {fieldLabel("Tài liệu (file docs)")}
                        <div style={{ marginTop: 6 }}>
                            <Upload beforeUpload={() => false} maxCount={1} accept=".xlsx,.xls,.doc,.docx,.ppt,.pptx,.txt,.pdf,.rar,.zip" fileList={fileDoc} onChange={handleFileChange}>
                                <Button icon={<UploadOutlined />}>Chọn tài liệu</Button>
                            </Upload>
                        </div>
                    </div>
                </Col>
                <Col span={12}>
                    <div style={{ marginBottom: 16 }}>
                        {fieldLabel("Tài liệu bản PDF")}
                        <div style={{ marginTop: 6 }}>
                            <Upload beforeUpload={() => false} maxCount={1} accept=".pdf,.rar,.zip" fileList={filePdf} onChange={handleFilePdfChange}>
                                <Button icon={<UploadOutlined />}>Chọn file PDF</Button>
                            </Upload>
                        </div>
                    </div>
                </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
                {fieldLabel("Tên tài liệu")}
                <Input
                    style={{ marginTop: 6 }}
                    placeholder="Tự điền từ tên file, có thể sửa lại"
                    value={data.NAME || ""}
                    onChange={(e) => setData((prev) => ({ ...prev, NAME: e.target.value }))}
                />
            </div>

            {/* Thông tin cơ bản */}
            <Divider orientation="left" orientationMargin={0}>Thông tin</Divider>
            <Row gutter={16}>
                <Col span={8}>
                    <div style={{ marginBottom: 16 }}>
                        {fieldLabel("Giá tiền")}
                        <InputNumber
                            style={{ width: "100%", marginTop: 6 }}
                            placeholder="Nhập giá tiền"
                            min={0}
                            value={data.PRICE || undefined}
                            formatter={(val) => val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
                            parser={(val) => val.replace(/,/g, "")}
                            onChange={(val) => setData((prev) => ({ ...prev, PRICE: val }))}
                        />
                    </div>
                </Col>
                <Col span={8}>
                    <div style={{ marginBottom: 16 }}>
                        {fieldLabel("Lớp")}
                        <Input style={{ marginTop: 6 }} placeholder="vd: Lớp 10" value={data.GRADE || ""} onChange={(e) => setData((prev) => ({ ...prev, GRADE: e.target.value }))} />
                    </div>
                </Col>
                <Col span={8}>
                    <div style={{ marginBottom: 16 }}>
                        {fieldLabel("Môn học")}
                        <Input style={{ marginTop: 6 }} placeholder="Nhập môn học" value={data.SUBJECT || ""} onChange={(e) => setData((prev) => ({ ...prev, SUBJECT: e.target.value }))} />
                    </div>
                </Col>
            </Row>
            <Row gutter={16}>
                <Col span={8}>
                    <div style={{ marginBottom: 16 }}>
                        {fieldLabel("Số trang")}
                        <InputNumber style={{ width: "100%", marginTop: 6 }} placeholder="Số trang" min={0} value={data.PAGE_COUNT || undefined} onChange={(val) => setData((prev) => ({ ...prev, PAGE_COUNT: val }))} />
                    </div>
                </Col>
                <Col span={8}>
                    <div style={{ marginBottom: 16 }}>
                        {fieldLabel("Loại tài liệu")}
                        <Select
                            style={{ width: "100%", marginTop: 6 }}
                            value={data.CATEGORY || "single"}
                            onChange={(value) => setData((prev) => ({ ...prev, CATEGORY: value }))}
                            options={[{ value: "single", label: "Tài liệu lẻ" }, { value: "bundle", label: "Tài liệu bộ" }]}
                        />
                    </div>
                </Col>
                <Col span={8}>
                    <div style={{ marginBottom: 16 }}>
                        {fieldLabel("Định dạng file")}
                        <Select
                            style={{ width: "100%", marginTop: 6 }}
                            value={data.FILE_TYPE || null}
                            placeholder="-- Chọn --"
                            allowClear
                            onChange={(value) => setData((prev) => ({ ...prev, FILE_TYPE: value || null }))}
                            options={[
                                { value: "doc", label: "Word (.doc)" }, { value: "docx", label: "Word (.docx)" },
                                { value: "pdf", label: "PDF (.pdf)" }, { value: "xlsx", label: "Excel (.xlsx)" },
                                { value: "xls", label: "Excel (.xls)" }, { value: "ppt", label: "PowerPoint (.ppt)" },
                                { value: "pptx", label: "PowerPoint (.pptx)" }, { value: "rar", label: "RAR (.rar)" },
                                { value: "zip", label: "ZIP (.zip)" },
                            ]}
                        />
                    </div>
                </Col>
            </Row>

            {/* Nội dung */}
            <Divider orientation="left" orientationMargin={0}>Nội dung</Divider>
            <Row gutter={16}>
                <Col span={12}>
                    <div style={{ marginBottom: 16 }}>
                        {fieldLabel("Danh sách email")}
                        <TextArea style={{ marginTop: 6 }} rows={3} placeholder="Nhập email ngăn cách nhau dấu ," value={data.EMAILS || ""} onChange={(e) => setData((prev) => ({ ...prev, EMAILS: e.target.value }))} />
                    </div>
                </Col>
                <Col span={12}>
                    <div style={{ marginBottom: 16 }}>
                        {fieldLabel("Chủ đề")}
                        <div style={{ marginTop: 6 }}>
                            <DebounceSelect
                                key={data}
                                mode="multiple"
                                initialValues={data.TOPIC_IDS}
                                size="large"
                                placeholder="-- Chọn chủ đề --"
                                fetchOptions={GetTopics}
                                onChange={(value) => setData((prev) => ({ ...prev, TOPIC_IDS: value === "" ? null : value.map((x) => x.value)?.join(",") }))}
                                style={{ width: "100%" }}
                            />
                        </div>
                    </div>
                </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
                {fieldLabel("Ảnh")}
                <div style={{ marginTop: 6, display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <Upload
                        customRequest={uploadFile}
                        listType="picture-card"
                        fileList={fileImage}
                        accept="image/*"
                        multiple={false}
                        onChange={({ fileList: newFileList }) => {
                            setFileImage(newFileList);
                            const done = newFileList.filter((x) => x.status === "done");
                            if (done.length > 0) setData((prev) => ({ ...prev, IMAGE_LINK: done[0].response.FilePath }));
                        }}
                    >
                        {fileImage.length > 0 ? null : <button style={{ border: 0, background: "none" }} type="button"><PlusOutlined /></button>}
                    </Upload>
                    <Button style={{ marginTop: 4 }} onClick={() => setIsImageModalVisible(true)}>Chọn ảnh có sẵn</Button>
                </div>
            </div>

            <div style={{ marginBottom: 16 }}>
                {fieldLabel("Mô tả")}
                <div style={{ marginTop: 6 }}>
                    <ReactQuill theme="snow" value={quill} onChange={(e) => setQuill(e)} />
                </div>
            </div>

            {/* Cài đặt */}
            <Divider orientation="left" orientationMargin={0}>Cài đặt</Divider>
            <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
                <Col flex="auto">
                    {fieldLabel("Trạng thái")}
                    <div style={{ marginTop: 8 }}>
                        <Radio.Group value={status} onChange={(e) => setStatus(e.target.value)} optionType="button" buttonStyle="solid">
                            <Radio.Button value="published">Đang phát hành</Radio.Button>
                            <Radio.Button value="folder">Thư mục</Radio.Button>
                            <Radio.Button value="featured">Nổi bật</Radio.Button>
                            <Radio.Button value="hidden">Ẩn khỏi trang</Radio.Button>
                        </Radio.Group>
                    </div>
                </Col>
                <Col>
                    <Checkbox checked={createBlog} onChange={(e) => setCreateBlog(e.target.checked)} style={{ marginTop: 24 }}>
                        Tạo blog
                    </Checkbox>
                </Col>
            </Row>
            </div>
        </Modal>

        <Modal title="Ảnh đang có" open={isImageModalVisible} footer={null} onCancel={() => setIsImageModalVisible(false)}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {existingImages.map((image) => (
                    <Image key={image} width={100} src={`${process.env.NEXT_PUBLIC_API_URL}${image}`} preview={false}
                        onClick={() => handleSelectImage(image)}
                        style={{ cursor: "pointer", border: data.IMAGE_LINK === image ? "2px solid #1890ff" : "1px solid #d9d9d9" }}
                    />
                ))}
            </div>
        </Modal>
        </>
    );
};

export default QuickCreateDocument;
