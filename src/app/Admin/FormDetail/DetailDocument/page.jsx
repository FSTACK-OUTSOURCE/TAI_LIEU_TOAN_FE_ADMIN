"use client";
import { getClientSideCookie } from "@/app/Api";
import {
    getChangeParentDocument,
    getDocumentInfo,
    postDocumentDownFile,
    postDocumentInfo,
} from "@/app/Api/apiDocument";
import { deleteFile, getFiles } from "@/app/Api/apiFile";
import { getTopicInfo } from "@/app/Api/apiTopic";
import { DebounceSelect } from "@/app/Component/DebounceSelect";
import { ReactQuill } from "@/app/Component/TextEditor";
import { guidEmpty } from "@/app/constans";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import {
    Button,
    Checkbox,
    Image,
    Input,
    Modal,
    Select,
    Spin,
    Upload,
} from "antd";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { saveAs } from "file-saver";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import styles from "../../../page.module.css";
const { TextArea } = Input;

const DetailDocument = (props) => {
    const { onClose, documentId, parentDocumentId } = props;
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({});
    const [quill, setQuilll] = useState("");
    const [file, setFile] = useState(null);
    const [fileUploadPdf, setFileUploadPdf] = useState(null);
    const [fileImage, setFileImage] = useState([]);
    const [fileImages, setFileImages] = useState([]);
    const [fileDoc, setFileDoc] = useState([]);
    const [filePdf, setFilePdf] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [createBlog, setCreateBlog] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

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
        const queryParams = { NAME: key, TOPIC_IDS: ids };
        var response = await getTopicInfo(queryParams, false);
        if (response.success && response.Items) {
            return response.Items.map((x) => ({
                label: x.NAME,
                value: x.TOPIC_ID,
                ...x,
            }));
        } else {
            return [];
        }
    };

    const openModal = () => {
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setIsModalVisible(false);
    };

    const GetExistImages = async () => {
        var response = await getFiles();
        if (response.success) {
            setExistingImages(response.Data);
        }
    };

    const handleSelectImage = (image) => {
        setFileImage([
            {
                uid: data.DOCUMENT_ID,
                id: data.DOCUMENT_ID,
                name: "image.png",
                status: "done",
                url: `${process.env.NEXT_PUBLIC_API_URL}${image}`,
            },
        ]);

        setData({ ...data, IMAGE_LINK: image });
        closeModal();
    };

    const handleFileChange = ({ file }) => {
        if (file.status == "removed") {
            setFile(null);
            setFileDoc([]);
        } else {
            setFile(file);
            setFileDoc([file]);
        }
    };
    const handleFilePdfChange = ({ file }) => {
        if (file.status == "removed") {
            setFilePdf([]);
            setFileUploadPdf(null);
        } else {
            setFilePdf([file]);
            setFileUploadPdf(file);
        }
    };

    const GetData = async (documentId) => {
        if (documentId) {
            const queryParams = { DOCUMENT_ID: documentId, Columns: "EMAILS" };
            var response = await getDocumentInfo(queryParams);
            if (
                response.success &&
                response.Items &&
                response.Items.length > 0
            ) {
                setData(response.Items[0]);
                await initOptions({
                    PARENT_DOCUMENT_ID: response.Items[0].PARENT_DOCUMENT_ID,
                    DOCUMENT_ID: response.Items[0].DOCUMENT_ID,
                });
                setQuilll(response.Items[0].DESCRIPTION);
                if (response.Items[0].IMAGE_LINK) {
                    setFileImage([
                        {
                            uid: response.Items[0].DOCUMENT_ID,
                            id: response.Items[0].DOCUMENT_ID,
                            name: "image.png",
                            status: "done",
                            url: `${process.env.NEXT_PUBLIC_API_URL}${response.Items[0].IMAGE_LINK}`,
                        },
                    ]);
                }
                if (response.Items[0].IMAGES) {
                    try {
                        const paths = JSON.parse(response.Items[0].IMAGES);
                        setFileImages(
                            paths.map((path, idx) => ({
                                uid: `detail-img-${idx}`,
                                name: `image-${idx}.png`,
                                status: "done",
                                url: `${process.env.NEXT_PUBLIC_API_URL}${path}`,
                                path,
                            })),
                        );
                    } catch {}
                }
                if (response.Items[0].FILE_KEY) {
                    setFileDoc([
                        {
                            uid: response.Items[0].FILE_KEY,
                            id: response.Items[0].FILE_KEY,
                            name: `${response.Items[0].NAME}${response.Items[0].FILE_EXTENSION}`,
                            status: "done",
                        },
                    ]);
                }
                if (response.Items[0].PDF_KEY) {
                    setFilePdf([
                        {
                            uid: response.Items[0].PDF_KEY,
                            id: response.Items[0].PDF_KEY,
                            name: `${response.Items[0].NAME}${response.Items[0].PDF_EXTENSION}`,
                            status: "done",
                        },
                    ]);
                }
                const doc = response.Items[0];
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
        } else {
            // await initOptions({ search: null, parentDocumentId: null })
            setData({});
        }
    };

    const onChange = (data) => {
        setData(data);
    };

    const onSave = async () => {
        const formData = new FormData();
        if (file) {
            formData.append("FILE", file);
        }
        if (fileUploadPdf) {
            formData.append("FILE_PDF", fileUploadPdf);
        }
        var saveData = { ...data, DESCRIPTION: quill };
        Object.keys(saveData).forEach((key) => {
            if (saveData[key] != null) {
                formData.append(key, saveData[key]);
            }
        });
        if (parentDocumentId != guidEmpty && parentDocumentId != null) {
            formData.append("PARENT_DOCUMENT_ID", parentDocumentId);
        }

        const response = await postDocumentInfo(formData);
        if (response.success) {
            if (createBlog) {
                if (!data.LINK_FULL?.trim()) {
                    Swal.fire("Lỗi", "Vui lòng nhập Link trọn bộ để tạo blog", "warning");
                    return;
                }
                if (!data.IMAGE_LINK?.trim()) {
                    Swal.fire("Lỗi", "Vui lòng upload Ảnh để tạo blog", "warning");
                    return;
                }
                try {
                    Swal.fire({ title: "Đang tạo blog...", allowOutsideClick: false });
                    Swal.showLoading();
                    const thumbnailUrl = data.IMAGE_LINK.startsWith("http")
                        ? data.IMAGE_LINK
                        : `${process.env.NEXT_PUBLIC_API_URL}${data.IMAGE_LINK}`;
                    const n8nResponse = await fetch(process.env.NEXT_PUBLIC_N8N_API, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            driver_url: data.LINK_FULL,
                            thumbnail_url: thumbnailUrl,
                            user_id: getUserIdFromToken(),
                            document_url:`https://tailieutoan.vn/${response.NAME_SLUG}`,
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

    const uploadButton = (
        <button style={{ border: 0, background: "none" }} type="button">
            <PlusOutlined />
        </button>
    );
    const uploadFile = async ({ file, onSuccess, onError }) => {
        const formData = new FormData();
        formData.append("file", file);

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
    };

    const uploadDetailImage = async ({ file, onSuccess, onError }) => {
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
            const newPath = response.data.FilePath;
            setFileImages((prev) => {
                const newList = [
                    ...prev,
                    {
                        uid: newPath,
                        name: "image.png",
                        status: "done",
                        url: `${process.env.NEXT_PUBLIC_API_URL}${newPath}`,
                        path: newPath,
                    },
                ];
                setData((d) => ({
                    ...d,
                    IMAGES: JSON.stringify(newList.map((x) => x.path)),
                }));
                return newList;
            });
        } catch (err) {
            onError(err);
        }
    };

    const handleDetailImageRemove = (file) => {
        setFileImages((prev) => {
            const newList = prev.filter((x) => x.uid !== file.uid);
            setData((d) => ({
                ...d,
                IMAGES: JSON.stringify(newList.map((x) => x.path)),
            }));
            return newList;
        });
    };

    useEffect(() => {
        GetData(documentId);
        GetExistImages();
    }, [documentId]);

    const handleFileDownload = async (file) => {
        if (file.url) {
            const response = await postDocumentDownFile({
                DOCUMENT_ID: data.DOCUMENT_ID,
            });
            if (response.success) {
                saveAs(response.data, `${data.NAME}.${data.FILE_EXTENSION}`);
            }
        }
    };

    const handleFileRemove = async (file) => {
        if (file.id) {
            await deleteFile(file.id);
        }
    };
    const initOptions = async (props) => {
        const { search, DOCUMENT_ID, PARENT_DOCUMENT_ID } = props;
        const queryParams = {
            IDENTITY_KEY: search,
            DOCUMENT_ID,
            PARENT_DOCUMENT_ID,
            Columns: "*",
            CurrentPage: 1,
            PageSize: 10,
        };
        var response = await getChangeParentDocument(queryParams);
        setOptions(
            response.Data.map((x) => ({
                value: x.DOCUMENT_ID,
                label: x.NAME,
            })),
        );
    };
    const fetchOptions = async (search) => {
        if (!search) return;
        if (isNaN(search)) return;
        initOptions({ search, DOCUMENT_ID: data?.DOCUMENT_ID });
        setLoading(true);
        try {
        } catch (error) {
            console.error("Error fetching options:", error);
        } finally {
            setLoading(false);
        }
    };
    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            fetchOptions(searchTerm);
        }
    };

    return (
        <>
        <Modal
            open={true}
            footer={null}
            closable={false}
            // style={{ overflowY: 'auto', width: '1000' }}
            width={1000}
        >
            <div className="col-lg-12 col-xl-12">
                <div className="row justify-content-center">
                    <p className="text-center h5 pt-3 pb-3 fw-bold mb-3 mx-1 mx-md-4">
                        {data?.DOCUMENT_ID
                            ? "Cập nhật tài liệu"
                            : "Thêm mới tài liệu"}
                    </p>
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="d-flex flex-row align-items-center">
                            <div className="form-outline flex-fill mb-0">
                                <label>Tên tài liệu cha</label>
                                <Select
                                    showSearch
                                    value={data?.PARENT_DOCUMENT_ID}
                                    placeholder="Nhập khóa tài liệu"
                                    notFoundContent={
                                        loading ? (
                                            <Spin size="small" />
                                        ) : (
                                            "No data"
                                        )
                                    }
                                    filterOption={false} // Prevent default filtering
                                    onKeyDown={handleKeyDown} // Fetch options dynamically
                                    onChange={(value) => {
                                        onChange({
                                            ...data,
                                            PARENT_DOCUMENT_ID: value,
                                        });
                                    }}
                                    onSearch={setSearchTerm}
                                    options={(options || []).map((d) => ({
                                        value: d.value,
                                        label: d.label,
                                    }))}
                                    style={{ width: "100%", height: "40px" }}
                                ></Select>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Tên tài liệu</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Nhập tên tài liệu"
                                value={data?.NAME}
                                onChange={(e) => {
                                    onChange({ ...data, NAME: e.target.value });
                                }}
                            />
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-6 col-xl-6 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <label className="mb-0">Link xem trước</label>
                                <Button
                                    size="small"
                                    onClick={() => setShowUploadModal(true)}
                                >
                                    Lấy link xem trước
                                </Button>
                            </div>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Nhập link xem trước"
                                value={data?.LINK_PREVIEW}
                                onChange={(e) => {
                                    onChange({
                                        ...data,
                                        LINK_PREVIEW: e.target.value,
                                    });
                                }}
                            />
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-6 col-xl-6 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Link trọn bộ</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Nhập link trọn bộ"
                                value={data?.LINK_FULL}
                                onChange={(e) => {
                                    onChange({
                                        ...data,
                                        LINK_FULL: e.target.value,
                                    });
                                }}
                            />
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-6 col-xl-6 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Giá tiền</label>
                            <input
                                type="number"
                                className="form-control"
                                placeholder="Nhập giá tiền"
                                value={data?.PRICE}
                                onChange={(e) => {
                                    onChange({
                                        ...data,
                                        PRICE: e.target.value,
                                    });
                                }}
                            />
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-6 col-xl-6 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Thứ tự hiển thị</label>
                            <input
                                type="number"
                                min={0}
                                className="form-control"
                                placeholder="Nhập số thứ tự"
                                value={data?.ORDER_NO}
                                onChange={(e) => {
                                    onChange({
                                        ...data,
                                        ORDER_NO: e.target.value,
                                    });
                                }}
                            />
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-6 col-xl-6 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Môn học</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Nhập môn học"
                                value={data?.SUBJECT || ""}
                                onChange={(e) => {
                                    onChange({
                                        ...data,
                                        SUBJECT: e.target.value,
                                    });
                                }}
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
                                value={data?.GRADE || ""}
                                onChange={(e) => {
                                    onChange({
                                        ...data,
                                        GRADE: e.target.value,
                                    });
                                }}
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
                                value={data?.PAGE_COUNT || ""}
                                onChange={(e) => {
                                    onChange({
                                        ...data,
                                        PAGE_COUNT: e.target.value,
                                    });
                                }}
                            />
                        </div>
                    </div>
                    <div className="col-md-6 col-lg-6 col-xl-6 order-2 order-lg-1 mb-4">
                        <div className="form-outline flex-fill mb-0">
                            <label>Loại tài liệu</label>
                            <Select
                                value={data?.CATEGORY || null}
                                placeholder="-- Chọn loại tài liệu --"
                                allowClear
                                onChange={(value) =>
                                    onChange({
                                        ...data,
                                        CATEGORY: value || null,
                                    })
                                }
                                style={{ width: "100%", height: "40px" }}
                                options={[
                                    { value: "single", label: "Tài liệu lẻ" },
                                    { value: "bundle", label: "Tài liệu bộ" },
                                ]}
                            />
                        </div>
                    </div>
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="row">
                            <div className="col-md-6 col-lg-6 col-xl-6">
                                <div className="form-outline flex-fill mb-0">
                                    <label>Định dạng file</label>
                                    <Select
                                        value={data?.FILE_TYPE || null}
                                        placeholder="-- Chọn định dạng file --"
                                        allowClear
                                        onChange={(value) =>
                                            onChange({
                                                ...data,
                                                FILE_TYPE: value || null,
                                            })
                                        }
                                        style={{
                                            width: "100%",
                                            height: "40px",
                                        }}
                                        options={[
                                            {
                                                value: "doc",
                                                label: "Word (.doc)",
                                            },
                                            {
                                                value: "docx",
                                                label: "Word (.docx)",
                                            },
                                            {
                                                value: "pdf",
                                                label: "PDF (.pdf)",
                                            },
                                            {
                                                value: "xlsx",
                                                label: "Excel (.xlsx)",
                                            },
                                            {
                                                value: "xls",
                                                label: "Excel (.xls)",
                                            },
                                            {
                                                value: "ppt",
                                                label: "PowerPoint (.ppt)",
                                            },
                                            {
                                                value: "pptx",
                                                label: "PowerPoint (.pptx)",
                                            },
                                            {
                                                value: "rar",
                                                label: "RAR (.rar)",
                                            },
                                            {
                                                value: "zip",
                                                label: "ZIP (.zip)",
                                            },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="d-flex flex-row align-items-center mb-3">
                            <div className="form-outline flex-fill mb-0">
                                <label>Tài liệu</label>
                                <Upload
                                    beforeUpload={() => false}
                                    maxCount={1}
                                    accept=".xlsx,.xls,.doc,.docx,.ppt,.pptx,.txt,.pdf,.rar,.zip"
                                    fileList={fileDoc}
                                    onChange={handleFileChange}
                                    onPreview={handleFileDownload}
                                    onRemove={handleFileRemove}
                                >
                                    <Button icon={<UploadOutlined />}>
                                        Chọn tài liệu
                                    </Button>
                                </Upload>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1 mb-4">
                        <div className="d-flex flex-row align-items-center mb-3">
                            <div className="form-outline flex-fill mb-0">
                                <label>Tài liệu bản pdf</label>
                                <Upload
                                    beforeUpload={() => false}
                                    maxCount={1}
                                    accept=".pdf,.rar,.zip"
                                    fileList={filePdf}
                                    onChange={handleFilePdfChange}
                                    onRemove={handleFileRemove}
                                >
                                    <Button icon={<UploadOutlined />}>
                                        Chọn tài liệu pdf
                                    </Button>
                                </Upload>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1">
                        <div className="d-flex flex-row align-items-center mb-4">
                            <div className="form-outline flex-fill mb-0">
                                <label>Danh sách email</label>
                                <TextArea
                                    rows={4}
                                    placeholder="Nhập email ngăn cách nhau dấu ,"
                                    value={data?.EMAILS}
                                    onChange={(e) => {
                                        onChange({
                                            ...data,
                                            EMAILS: e.target.value,
                                        });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1">
                        <div className="d-flex flex-row align-items-center mb-3">
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
                                        var banners = newFileList.filter(
                                            (x) => x.status == "done",
                                        );
                                        if (banners && banners.length > 0) {
                                            onChange({
                                                ...data,
                                                IMAGE_LINK:
                                                    banners[0].response
                                                        .FilePath,
                                            });
                                        }
                                    }}
                                >
                                    {fileImage.length > 0 ? null : uploadButton}
                                </Upload>
                                <Button onClick={openModal}>Chọn ảnh</Button>
                                <Modal
                                    title="Ảnh đang có"
                                    open={isModalVisible}
                                    footer={null}
                                    onCancel={closeModal}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "10px",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        {existingImages.map((image) => {
                                            return (
                                                <Image
                                                    key={image.uid}
                                                    width={100}
                                                    src={`${process.env.NEXT_PUBLIC_API_URL}${image}`}
                                                    preview={false}
                                                    onClick={() =>
                                                        handleSelectImage(image)
                                                    }
                                                    style={{
                                                        cursor: "pointer",
                                                        border:
                                                            data.IMAGE_LINK ===
                                                            image
                                                                ? "2px solid #1890ff"
                                                                : "1px solid #d9d9d9",
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </Modal>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1">
                        <div className="d-flex flex-row align-items-center mb-3">
                            <div className="form-outline flex-fill mb-0">
                                <label>Ảnh chi tiết (nhiều ảnh)</label>
                                <Upload
                                    customRequest={uploadDetailImage}
                                    listType="picture-card"
                                    fileList={fileImages}
                                    accept="image/*"
                                    multiple={true}
                                    onRemove={handleDetailImageRemove}
                                >
                                    <div>
                                        <PlusOutlined />
                                        <div style={{ marginTop: 8 }}>
                                            Tải ảnh lên
                                        </div>
                                    </div>
                                </Upload>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1">
                        <div className="d-flex flex-row align-items-center mb-4">
                            <div className="form-outline flex-fill mb-0">
                                <label>Chủ đề</label>
                                <DebounceSelect
                                    key={data}
                                    mode="multiple"
                                    initialValues={data?.TOPIC_IDS}
                                    size="large"
                                    placeholder=" -- Chọn chủ đề -- "
                                    fetchOptions={GetTopics}
                                    onChange={(value) => {
                                        onChange({
                                            ...data,
                                            TOPIC_IDS:
                                                value == ""
                                                    ? null
                                                    : value
                                                          .map((x) => x.value)
                                                          ?.join(","),
                                        });
                                    }}
                                    style={{
                                        width: "100%",
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1">
                        <div className="d-flex flex-row align-items-center mb-4">
                            <div className="form-outline mb-0">
                                <Checkbox
                                    onChange={(e) => {
                                        onChange({
                                            ...data,
                                            IS_FOLDER: !data.IS_FOLDER,
                                        });
                                    }}
                                    checked={data?.IS_FOLDER}
                                >
                                    Thư mục
                                </Checkbox>
                            </div>
                        </div>
                        <div className="d-flex flex-row align-items-center mb-4">
                            <div className="form-outline mb-0">
                                <Checkbox
                                    onChange={(e) => {
                                        onChange({
                                            ...data,
                                            IS_PUBLIC: !data.IS_PUBLIC,
                                        });
                                    }}
                                    checked={data?.IS_PUBLIC}
                                >
                                    Đang phát hành
                                </Checkbox>
                            </div>
                        </div>
                        <div className="d-flex flex-row align-items-center mb-4">
                            <div className="form-outline mb-0">
                                <Checkbox
                                    onChange={(e) => {
                                        onChange({
                                            ...data,
                                            IS_PIN: !data.IS_PIN,
                                        });
                                    }}
                                    checked={data?.IS_PIN}
                                >
                                    Nổi bật
                                </Checkbox>
                            </div>
                        </div>
                        <div className="d-flex flex-row align-items-center mb-4">
                            <div className="form-outline mb-0">
                                <Checkbox
                                    onChange={(e) => {
                                        onChange({
                                            ...data,
                                            IS_HIDDEN: !data.IS_HIDDEN,
                                        });
                                    }}
                                    checked={data?.IS_HIDDEN}
                                >
                                    Ẩn khỏi trang
                                </Checkbox>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1">
                        <div className="d-flex flex-row align-items-center mb-4">
                            <div className="form-outline flex-fill mb-0">
                                <label>Mô tảâ</label>
                                <ReactQuill
                                    theme="snow"
                                    value={quill}
                                    onChange={(e) => {
                                        setQuilll(e);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1">
                        <div className="d-flex flex-row align-items-center mb-4">
                            <Checkbox
                                checked={createBlog}
                                onChange={(e) => setCreateBlog(e.target.checked)}
                            >
                                Tạo blog (dùng Ảnh và Link trọn bộ)
                            </Checkbox>
                        </div>
                    </div>
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

        <Modal
            title="Get link preview"
            open={showUploadModal}
            onCancel={() => setShowUploadModal(false)}
            footer={null}
            width={900}
            styles={{ body: { padding: 0 } }}
        >
            <iframe
                src="https://tailieutoan.vn/private/unix/upload"
                style={{ width: "100%", height: 600, border: "none" }}
                title="Upload preview"
            />
        </Modal>
        </>
    );
};

export default DetailDocument;
