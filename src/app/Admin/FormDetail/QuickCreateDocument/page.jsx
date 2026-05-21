"use client";
import { getClientSideCookie } from "@/app/Api";
import { getDocumentInfo, postDocumentInfo } from "@/app/Api/apiDocument";
import { getFiles } from "@/app/Api/apiFile";
import { getTopicInfo } from "@/app/Api/apiTopic";
import { DebounceSelect } from "@/app/Component/DebounceSelect";
import { ReactQuill } from "@/app/Component/TextEditor";
import { guidEmpty } from "@/app/constans";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Checkbox, Image, Input, Modal, Radio, Select, Upload } from "antd";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
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

const QuickCreateDocument = ({ onClose, parentDocumentId }) => {
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

    useEffect(() => {
        if (parentDocumentId && parentDocumentId !== guidEmpty) {
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
    }, []);

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
            const nameWithoutExt = ext ? latest.name.slice(0, -ext.length) : latest.name;
            setData((prev) => ({
                ...prev,
                NAME: nameWithoutExt,
                FILE_TYPE: prev.FILE_TYPE || FILE_TYPE_MAP[ext] || null,
            }));
        }
    };

    const handleFilePdfChange = ({ file }) => {
        if (file.status === "removed") {
            setFilePdf([]);
            setFileUploadPdf(null);
        } else {
            setFilePdf([file]);
            setFileUploadPdf(file);
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
        if (response.success) {
            if (createBlog) {
                try {
                    Swal.fire({ title: "Đang tạo blog...", allowOutsideClick: false });
                    Swal.showLoading();
                    const thumbnailUrl = data.IMAGE_LINK?.startsWith("http")
                        ? data.IMAGE_LINK
                        : `${process.env.NEXT_PUBLIC_API_URL}${data.IMAGE_LINK}`;
                    const n8nResponse = await fetch(process.env.NEXT_PUBLIC_N8N_API, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            driver_url: data.LINK_FULL,
                            thumbnail_url: thumbnailUrl,
                            user_id: getUserIdFromToken(),
                            document_url: `https://tailieutoan.vn/${response.NAME_SLUG}`,
                        }),
                    });
                    if (n8nResponse.ok) {
                        Swal.fire("Thành công", "Đã lưu tài liệu và tạo bài viết blog thành công", "success");
                    } else {
                        Swal.fire("Cảnh báo", "Đã lưu tài liệu nhưng tạo blog tự động thất bại", "warning");
                    }
                } catch {
                    Swal.fire("Cảnh báo", "Đã lưu tài liệu nhưng không thể kết nối đến webhook blog", "warning");
                }
            }
            onClose();
        }
    };

    return (
        <Modal open={true} footer={null} closable={false} width={1000}>
            <div className="col-lg-12">
                <div className="row justify-content-center">
                    <p className="text-center h5 pt-3 pb-3 fw-bold mb-3 mx-1 mx-md-4">
                        Tạo tài liệu tự động
                    </p>

                    {/* File docs - upload trước để auto-fill tên */}
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="d-flex flex-row align-items-center mb-3">
                            <div className="form-outline flex-fill mb-0">
                                <label>Tài liệu (file docs)</label>
                                <Upload
                                    beforeUpload={() => false}
                                    maxCount={1}
                                    accept=".xlsx,.xls,.doc,.docx,.ppt,.pptx,.txt,.pdf,.rar,.zip"
                                    fileList={fileDoc}
                                    onChange={handleFileChange}
                                >
                                    <Button icon={<UploadOutlined />}>Chọn tài liệu</Button>
                                </Upload>
                            </div>
                        </div>
                    </div>

                    {/* Tên tài liệu */}
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Tên tài liệu</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Nhập tên tài liệu"
                                value={data.NAME || ""}
                                onChange={(e) => setData((prev) => ({ ...prev, NAME: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* File PDF */}
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="d-flex flex-row align-items-center mb-3">
                            <div className="form-outline flex-fill mb-0">
                                <label>Tài liệu bản PDF</label>
                                <Upload
                                    beforeUpload={() => false}
                                    maxCount={1}
                                    accept=".pdf,.rar,.zip"
                                    fileList={filePdf}
                                    onChange={handleFilePdfChange}
                                >
                                    <Button icon={<UploadOutlined />}>Chọn file PDF</Button>
                                </Upload>
                            </div>
                        </div>
                    </div>

                    {/* Giá tiền & Lớp */}
                    <div className="col-md-6 col-lg-6 col-xl-6 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Giá tiền</label>
                            <input
                                type="number"
                                className="form-control"
                                placeholder="Nhập giá tiền"
                                value={data.PRICE || ""}
                                onChange={(e) => setData((prev) => ({ ...prev, PRICE: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-6 col-xl-6 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Lớp</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Nhập lớp (vd: Lớp 10)"
                                value={data.GRADE || ""}
                                onChange={(e) => setData((prev) => ({ ...prev, GRADE: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Môn học & Số trang */}
                    <div className="col-md-6 col-lg-6 col-xl-6 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Môn học</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Nhập môn học"
                                value={data.SUBJECT || ""}
                                onChange={(e) => setData((prev) => ({ ...prev, SUBJECT: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-6 col-xl-6 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Số trang</label>
                            <input
                                type="number"
                                min={0}
                                className="form-control"
                                placeholder="Nhập số trang"
                                value={data.PAGE_COUNT || ""}
                                onChange={(e) => setData((prev) => ({ ...prev, PAGE_COUNT: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Loại tài liệu & Định dạng file */}
                    <div className="col-md-6 col-lg-6 col-xl-6 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Loại tài liệu</label>
                            <Select
                                value={data.CATEGORY || "single"}
                                onChange={(value) => setData((prev) => ({ ...prev, CATEGORY: value }))}
                                style={{ width: "100%", height: "40px" }}
                                options={[
                                    { value: "single", label: "Tài liệu lẻ" },
                                    { value: "bundle", label: "Tài liệu bộ" },
                                ]}
                            />
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-6 col-xl-6 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Định dạng file</label>
                            <Select
                                value={data.FILE_TYPE || null}
                                placeholder="-- Chọn định dạng file --"
                                allowClear
                                onChange={(value) => setData((prev) => ({ ...prev, FILE_TYPE: value || null }))}
                                style={{ width: "100%", height: "40px" }}
                                options={[
                                    { value: "doc", label: "Word (.doc)" },
                                    { value: "docx", label: "Word (.docx)" },
                                    { value: "pdf", label: "PDF (.pdf)" },
                                    { value: "xlsx", label: "Excel (.xlsx)" },
                                    { value: "xls", label: "Excel (.xls)" },
                                    { value: "ppt", label: "PowerPoint (.ppt)" },
                                    { value: "pptx", label: "PowerPoint (.pptx)" },
                                    { value: "rar", label: "RAR (.rar)" },
                                    { value: "zip", label: "ZIP (.zip)" },
                                ]}
                            />
                        </div>
                    </div>

                    {/* Danh sách email */}
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Danh sách email</label>
                            <TextArea
                                rows={3}
                                placeholder="Nhập email ngăn cách nhau dấu ,"
                                value={data.EMAILS || ""}
                                onChange={(e) => setData((prev) => ({ ...prev, EMAILS: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Ảnh */}
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Ảnh</label>
                            <Upload
                                customRequest={uploadFile}
                                listType="picture-card"
                                fileList={fileImage}
                                accept="image/*"
                                multiple={false}
                                onChange={({ fileList: newFileList }) => {
                                    setFileImage(newFileList);
                                    const done = newFileList.filter((x) => x.status === "done");
                                    if (done.length > 0) {
                                        setData((prev) => ({ ...prev, IMAGE_LINK: done[0].response.FilePath }));
                                    }
                                }}
                            >
                                {fileImage.length > 0 ? null : (
                                    <button style={{ border: 0, background: "none" }} type="button">
                                        <PlusOutlined />
                                    </button>
                                )}
                            </Upload>
                            <Button onClick={() => setIsImageModalVisible(true)}>Chọn ảnh có sẵn</Button>
                            <Modal
                                title="Ảnh đang có"
                                open={isImageModalVisible}
                                footer={null}
                                onCancel={() => setIsImageModalVisible(false)}
                            >
                                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                    {existingImages.map((image) => (
                                        <Image
                                            key={image}
                                            width={100}
                                            src={`${process.env.NEXT_PUBLIC_API_URL}${image}`}
                                            preview={false}
                                            onClick={() => handleSelectImage(image)}
                                            style={{
                                                cursor: "pointer",
                                                border: data.IMAGE_LINK === image ? "2px solid #1890ff" : "1px solid #d9d9d9",
                                            }}
                                        />
                                    ))}
                                </div>
                            </Modal>
                        </div>
                    </div>

                    {/* Chủ đề */}
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Chủ đề</label>
                            <DebounceSelect
                                key={data}
                                mode="multiple"
                                initialValues={data.TOPIC_IDS}
                                size="large"
                                placeholder=" -- Chọn chủ đề -- "
                                fetchOptions={GetTopics}
                                onChange={(value) => {
                                    setData((prev) => ({
                                        ...prev,
                                        TOPIC_IDS: value === "" ? null : value.map((x) => x.value)?.join(","),
                                    }));
                                }}
                                style={{ width: "100%" }}
                            />
                        </div>
                    </div>

                    {/* Mô tả */}
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Mô tả</label>
                            <ReactQuill
                                theme="snow"
                                value={quill}
                                onChange={(e) => setQuill(e)}
                            />
                        </div>
                    </div>

                    {/* Tạo blog */}
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="form-outline mb-0">
                            <Checkbox
                                checked={createBlog}
                                onChange={(e) => setCreateBlog(e.target.checked)}
                            >
                                Tạo blog
                            </Checkbox>
                        </div>
                    </div>

                    {/* Trạng thái */}
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="form-outline mb-0">
                            <label className="d-block mb-2">Trạng thái</label>
                            <Radio.Group value={status} onChange={(e) => setStatus(e.target.value)}>
                                <Radio value="published">Đang phát hành</Radio>
                                <Radio value="folder">Thư mục</Radio>
                                <Radio value="featured">Nổi bật</Radio>
                                <Radio value="hidden">Ẩn khỏi trang</Radio>
                            </Radio.Group>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="col-md-10 col-lg-6 col-xl-6 order-2 order-lg-1">
                        <div className="d-flex justify-content-center mx-4 mb-3 mb-lg-4">
                            <button
                                type="button"
                                className={`btn btn-success btn-md ${styles.m3}`}
                                onClick={onSave}
                            >
                                Lưu
                            </button>
                            <button
                                type="button"
                                className={`btn btn-primary btn-md ${styles.m3}`}
                                onClick={onClose}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default QuickCreateDocument;
