"use client";
import { getClientSideCookie } from "@/app/Api";
import { getDocumentInfo, postDocumentInfo } from "@/app/Api/apiDocument";
import { N8N_UPLOAD_SIZE_THRESHOLD, uploadToN8nWebhook } from "@/app/Api/apiN8nUpload";
import { getTopicInfo } from "@/app/Api/apiTopic";
import { DebounceSelect } from "@/app/component/DebounceSelect";
import { guidEmpty } from "@/app/constans";
import { finishBackgroundJob, startBackgroundJob, updateBackgroundJob } from "@/app/utils/backgroundJobs";
import { DeleteOutlined, InboxOutlined, PictureOutlined } from "@ant-design/icons";
import {
    Button,
    Checkbox,
    Col,
    Collapse,
    Input,
    InputNumber,
    Modal,
    Radio,
    Row,
    Select,
    Upload,
    message,
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
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const PDF_TO_IMAGE_API = "https://api-pdf.fstack.asia/pdf-to-image";

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

const getFileKey = (file) => (file ? `${file.name}-${file.size}-${file.lastModified || ""}` : "");

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
            return ext === ".pdf" || DOWNLOAD_EXTENSIONS.includes(ext) || IMAGE_EXTENSIONS.includes(ext);
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
            thumbnailFile: null,
            thumbnailPreview: "",
            detailImages: [],
            pdfImageStatus: "idle",
            pdfImageError: "",
            pdfImageFileKey: "",
            shouldAutoGenerateImages: true,
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
        } else if (IMAGE_EXTENSIONS.includes(ext)) {
            current.thumbnailFile = file;
            current.thumbnailPreview = URL.createObjectURL(file);
        }

        current.status = current.pdfFile || current.downloadFile ? "ready" : "invalid";
        grouped.set(groupKey, current);
    });

    return Array.from(grouped.values()).map((row, index) => ({
        ...row,
        orderNo: row.orderNo ?? index + 1,
    }));
};

// Dragger's fileList is cumulative, so buildRowsFromFiles recomputes every row (old + new)
// from scratch on every drop. Merge its output back onto the previous rows so already
// generated thumbnails/detail images/edits on existing rows survive, and only rows whose
// PDF actually changed (or brand-new rows) get regenerated.
const mergeRowsWithPrevious = (newRows, prevRows) => {
    const prevByKey = new Map(prevRows.map((row) => [row.key, row]));
    return newRows.map((newRow) => {
        const prevRow = prevByKey.get(newRow.key);
        if (!prevRow) return newRow;

        const pdfUnchanged = getFileKey(prevRow.pdfFile) === getFileKey(newRow.pdfFile);
        const thumbnailFile = pdfUnchanged
            ? prevRow.thumbnailFile
            : newRow.thumbnailFile || prevRow.thumbnailFile;
        const thumbnailChanged = thumbnailFile !== prevRow.thumbnailFile;

        return {
            ...prevRow,
            name: newRow.name,
            folderPath: newRow.folderPath,
            pdfFile: newRow.pdfFile,
            downloadFile: newRow.downloadFile,
            usePreview: prevRow.usePreview || newRow.usePreview,
            useDownload: prevRow.useDownload || newRow.useDownload,
            fileType: prevRow.fileType || newRow.fileType,
            status: newRow.status,
            thumbnailFile,
            thumbnailPreview: thumbnailChanged ? newRow.thumbnailPreview : prevRow.thumbnailPreview,
            detailImages: pdfUnchanged ? prevRow.detailImages : [],
            pdfImageStatus: pdfUnchanged ? prevRow.pdfImageStatus : "idle",
            pdfImageError: pdfUnchanged ? prevRow.pdfImageError : "",
            pdfImageFileKey: pdfUnchanged ? prevRow.pdfImageFileKey : "",
        };
    });
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
    const [parentSearchTerm, setParentSearchTerm] = useState("");
    const [parentSearchMode, setParentSearchMode] = useState("full");
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

    const dedupeDocuments = (...lists) => {
        const map = new Map();
        lists.flat().forEach((doc) => {
            if (doc?.DOCUMENT_ID) map.set(doc.DOCUMENT_ID, doc);
        });
        return Array.from(map.values());
    };

    const fetchParentOptions = async (search, selectedOption, keyOnly = false) => {
        setParentLoading(true);
        try {
            const keyword = search?.trim();
            const baseParams = {
                Columns: "*",
                IS_FOLDER: true,
                CurrentPage: 1,
                PageSize: 10000,
            };
            let items;
            if (keyword && keyOnly) {
                const response = await getDocumentInfo({ ...baseParams, IDENTITY_KEY: keyword }, false);
                items = response.Items || [];
            } else if (keyword) {
                const queries = [getDocumentInfo({ ...baseParams, NAME: keyword }, false)];
                if (!isNaN(keyword)) {
                    queries.push(getDocumentInfo({ ...baseParams, IDENTITY_KEY: keyword }, false));
                }
                const responses = await Promise.all(queries);
                items = dedupeDocuments(...responses.map((r) => r.Items || []));
            } else {
                const response = await getDocumentInfo(baseParams, false);
                items = response.Items || [];
            }
            const apiOptions = items.map(toParentOption);
            setParentOptions((prev) => {
                const keepSelected = selectedOption
                    ? [selectedOption]
                    : prev.filter((o) => o.value === selectedParentId);
                return mergeParentOptions(keepSelected, apiOptions);
            });
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

    const openPdfPreview = (file) => {
        if (!file || getExtension(file.name) !== ".pdf") return;
        const previewUrl = URL.createObjectURL(file);
        window.open(previewUrl, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
    };

    const handleReplacePreview = async (row, file) => {
        const uploadFile = normalizeUploadFile(file);
        const isPdf = getExtension(uploadFile.name) === ".pdf";
        const isReplacingExistingPdf = isPdf && Boolean(row.pdfFile);
        const fileKey = getFileKey(uploadFile);

        if (isReplacingExistingPdf) {
            Modal.confirm({
                title: "Tạo lại ảnh tự động?",
                content: "Bạn có muốn tạo lại thumbnail và ảnh chi tiết tự động bằng file PDF mới này không?",
                okText: "Tạo lại ảnh",
                cancelText: "Chỉ thay file",
                onOk: () => {
                    updateRow(row.key, {
                        pdfFile: uploadFile,
                        usePreview: true,
                        name: row.name || getBaseName(uploadFile.name),
                        thumbnailFile: null,
                        thumbnailPreview: "",
                        detailImages: [],
                        pdfImageStatus: "idle",
                        pdfImageError: "",
                        pdfImageFileKey: "",
                        shouldAutoGenerateImages: true,
                    });
                },
                onCancel: () => {
                    updateRow(row.key, {
                        pdfFile: uploadFile,
                        usePreview: true,
                        name: row.name || getBaseName(uploadFile.name),
                        pdfImageStatus: "skipped",
                        pdfImageError: "",
                        pdfImageFileKey: fileKey,
                        shouldAutoGenerateImages: false,
                    });
                },
            });
            return false;
        }

        updateRow(row.key, {
            pdfFile: uploadFile,
            usePreview: true,
            name: row.name || getBaseName(uploadFile.name),
            pdfImageStatus: "idle",
            pdfImageError: "",
            pdfImageFileKey: "",
            shouldAutoGenerateImages: isPdf,
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

    const handleReplaceThumbnail = (row, file) => {
        const uploadFile = normalizeUploadFile(file);
        updateRow(row.key, {
            thumbnailFile: uploadFile,
            thumbnailPreview: URL.createObjectURL(uploadFile),
        });
        return false;
    };

    const handleAddDetailImages = (row, fileList) => {
        const existingKeys = new Set((row.detailImages || []).map((image) => image.fileKey));
        const nextImages = fileList
            .map((file) => {
                const uploadFile = normalizeUploadFile(file);
                const fileKey = `${uploadFile.name}-${uploadFile.size}-${uploadFile.lastModified || ""}`;
                if (existingKeys.has(fileKey)) return null;
                return {
                    uid: `${fileKey}-${Math.random()}`,
                    fileKey,
                    file: uploadFile,
                    name: uploadFile.name,
                    preview: URL.createObjectURL(uploadFile),
                };
            })
            .filter(Boolean);
        if (!nextImages.length) return;
        updateRow(row.key, {
            detailImages: [...(row.detailImages || []), ...nextImages],
        });
    };

    const removeDetailImage = (row, imageUid) => {
        updateRow(row.key, {
            detailImages: (row.detailImages || []).filter((image) => image.uid !== imageUid),
        });
    };

    const uploadThumbnail = async (file) => {
        if (!file) return "";
        const uploaded = await uploadToN8nWebhook(file);
        return uploaded.url || "";
    };

    const uploadImages = async (images = []) => {
        const paths = [];
        for (const image of images) {
            const path = await uploadThumbnail(image.file);
            if (path) paths.push(path);
        }
        return paths;
    };

    const base64ToImageFile = (base64, fileName) => {
        const cleanBase64 = base64.includes(",") ? base64.split(",").pop() : base64;
        const binary = atob(cleanBase64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }
        return new File([bytes], fileName, { type: "image/png" });
    };

    const convertPdfPreviewToImages = async (pdfFile, rowName) => {
        if (!pdfFile) return [];
        const response = await fetch(PDF_TO_IMAGE_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/octet-stream",
            },
            body: pdfFile,
        });

        if (!response.ok) {
            throw new Error(`PDF to image failed with status ${response.status}`);
        }

        const data = await response.json();
        return (data.pages || []).map((pageBase64, index) =>
            base64ToImageFile(pageBase64, `${rowName || "document"}-page-${index + 1}.png`),
        );
    };

    const applyGeneratedPdfImagesToRow = (row, generatedImages, fileKey) => {
        const generatedDetailImages = generatedImages.slice(1).map((file, index) => ({
            uid: `${fileKey}-generated-${index + 1}`,
            fileKey: `${file.name}-${file.size}-${file.lastModified || ""}`,
            file,
            name: file.name,
            preview: URL.createObjectURL(file),
            generatedFromPdf: true,
        }));

        setRows((prevRows) =>
            prevRows.map((currentRow) => {
                if (currentRow.key !== row.key) return currentRow;
                return {
                    ...currentRow,
                    thumbnailFile: currentRow.thumbnailFile || generatedImages[0] || null,
                    thumbnailPreview: currentRow.thumbnailPreview || (generatedImages[0] ? URL.createObjectURL(generatedImages[0]) : ""),
                    detailImages: (currentRow.detailImages || []).length ? currentRow.detailImages : generatedDetailImages,
                    pdfImageStatus: "done",
                    pdfImageError: "",
                    pdfImageFileKey: fileKey,
                };
            }),
        );
    };

    useEffect(() => {
        rows.forEach((row) => {
            const fileKey = getFileKey(row.pdfFile);
            const shouldConvert =
                row.usePreview &&
                row.pdfFile &&
                row.shouldAutoGenerateImages !== false &&
                getExtension(row.pdfFile.name) === ".pdf" &&
                row.pdfImageStatus !== "loading" &&
                row.pdfImageFileKey !== fileKey &&
                (!row.thumbnailFile || !(row.detailImages || []).length);

            if (!shouldConvert) return;

            setRows((prevRows) =>
                prevRows.map((currentRow) =>
                    currentRow.key === row.key
                        ? { ...currentRow, pdfImageStatus: "loading", pdfImageError: "" }
                        : currentRow,
                ),
            );

            convertPdfPreviewToImages(row.pdfFile, row.name)
                .then((generatedImages) => {
                    applyGeneratedPdfImagesToRow(row, generatedImages, fileKey);
                })
                .catch((error) => {
                    console.warn("PDF preview image generation failed:", error);
                    setRows((prevRows) =>
                        prevRows.map((currentRow) =>
                            currentRow.key === row.key
                                ? {
                                      ...currentRow,
                                      pdfImageStatus: "error",
                                      pdfImageError: "Không thể tự tạo ảnh từ PDF preview.",
                                      pdfImageFileKey: fileKey,
                                  }
                                : currentRow,
                        ),
                    );
                });
        });
    }, [rows]);

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
        webhookFormData.append("THUMBNAIL_URL", documentResponse?.IMAGE_LINK || row.thumbnailUrl || "");
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
        startBackgroundJob({
            id: jobKey,
            title: "Đăng bài hàng loạt",
            description: `Bắt đầu tạo ${validRows.length} tài liệu...`,
            percent: 3,
        });
        onClose();

        let successCount = 0;
        let failCount = 0;
        let skippedAutomationCount = 0;

        for (let index = 0; index < validRows.length; index += 1) {
            const row = validRows[index];
            const basePercent = Math.round((index / validRows.length) * 90) + 5;
            try {
                updateBackgroundJob(jobKey, {
                    percent: basePercent,
                    description: `Đang lưu ${index + 1}/${validRows.length}: ${row.name}`,
                });

                const formData = new FormData();
                const totalSize =
                    (row.useDownload && row.downloadFile ? row.downloadFile.size : 0) +
                    (row.usePreview && row.pdfFile ? row.pdfFile.size : 0);
                const useN8nUpload = totalSize > N8N_UPLOAD_SIZE_THRESHOLD;

                if (row.useDownload && row.downloadFile) {
                    if (useN8nUpload) {
                        const uploaded = await uploadToN8nWebhook(row.downloadFile);
                        formData.append("FILE_KEY", uploaded.key);
                        formData.append("FILE_EXTENSION", uploaded.extension);
                        formData.append("FILE_SIZE", uploaded.size);
                    } else {
                        formData.append("FILE", row.downloadFile);
                    }
                }
                if (row.usePreview && row.pdfFile) {
                    if (useN8nUpload) {
                        const uploaded = await uploadToN8nWebhook(row.pdfFile);
                        formData.append("PDF_KEY", uploaded.key);
                        formData.append("PDF_EXTENSION", uploaded.extension);
                    } else {
                        formData.append("FILE_PDF", row.pdfFile);
                    }
                }
                let generatedPdfImages = [];
                if (row.usePreview && row.pdfFile && (!row.thumbnailFile || !(row.detailImages || []).length)) {
                    updateBackgroundJob(jobKey, {
                        percent: basePercent + 1,
                        description: `Đang chuyển PDF preview sang ảnh: ${row.name}`,
                    });
                    generatedPdfImages = await convertPdfPreviewToImages(row.pdfFile, row.name);
                }

                const thumbnailFile = row.thumbnailFile || generatedPdfImages[0] || null;
                const detailImages = (row.detailImages || []).length
                    ? row.detailImages
                    : generatedPdfImages.slice(1).map((file) => ({ file }));
                const thumbnailUrl = thumbnailFile ? await uploadThumbnail(thumbnailFile) : row.thumbnailUrl || "";
                const detailImagePaths = await uploadImages(detailImages);

                const saveData = {
                    NAME: row.name,
                    PRICE: row.price ?? defaults.PRICE,
                    ORDER_NO: row.orderNo,
                    GRADE: defaults.GRADE || undefined,
                    SUBJECT: defaults.SUBJECT || undefined,
                    CATEGORY: defaults.CATEGORY || "single",
                    FILE_TYPE: row.fileType || defaults.FILE_TYPE,
                    TOPIC_IDS: defaults.TOPIC_IDS || undefined,
                    IMAGE_LINK: thumbnailUrl || undefined,
                    IMAGES: detailImagePaths.length ? JSON.stringify(detailImagePaths) : undefined,
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
                    updateBackgroundJob(jobKey, {
                        percent: basePercent + 3,
                        description: `Đã lưu ${row.name}. Đang gửi n8n xử lý nền...`,
                    });
                    await callAutomation(response, { ...row, thumbnailUrl }, createBlog);
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
        finishBackgroundJob(
            jobKey,
            {
                percent: 100,
                status: doneStatus,
                description: `Hoàn tất: ${successCount} thành công, ${failCount} lỗi${skippedAutomationCount ? `, ${skippedAutomationCount} không gửi n8n vì chưa có file preview` : ""}.`,
            },
        );
        setRunning(false);
    };

    const stopCollapse = (event) => event.stopPropagation();

    const renderCheck = (label, checked, disabled, onChange) => (
        <Checkbox
            checked={checked}
            disabled={disabled}
            onClick={stopCollapse}
            onChange={onChange}
        >
            {label}
        </Checkbox>
    );

    const renderFileCard = ({ title, checked, disabled, onCheck, fileName, accept, onUpload, buttonText, previewFile, children }) => (
        <div className={styles.bulkFileCard}>
            <div className={styles.bulkFileCardHeader}>
                {renderCheck(title, checked, disabled, onCheck)}
            </div>
            {children}
            <div className={styles.bulkFileName}>{fileName || "Chưa có"}</div>
            <div className={styles.bulkFileActions}>
                <Upload beforeUpload={onUpload} showUploadList={false} accept={accept} maxCount={1}>
                    <Button size="small" className={styles.bulkReplaceButton}>
                        {buttonText}
                    </Button>
                </Upload>
                {previewFile && getExtension(previewFile.name) === ".pdf" && (
                    <Button
                        size="small"
                        type="default"
                        className={styles.bulkReplaceButton}
                        onClick={() => openPdfPreview(previewFile)}
                    >
                        Open New tab preview
                    </Button>
                )}
            </div>
        </div>
    );

    const renderItemHeader = (row, index) => (
        <div className={styles.bulkItemHeader}>
            <div className={styles.bulkItemTitleBlock}>
                <span className={styles.bulkItemIndex}>{index + 1}</span>
                <span className={styles.bulkItemTitle}>{row.name || "Chưa đặt tên"}</span>
            </div>
            <div className={styles.bulkItemChecks}>
                {renderCheck("Preview", row.usePreview, !row.pdfFile, (e) => updateRow(row.key, { usePreview: e.target.checked }))}
                {renderCheck("File tải", row.useDownload, !row.downloadFile, (e) => updateRow(row.key, { useDownload: e.target.checked }))}
                <span className={row.thumbnailFile ? styles.bulkStatusOk : styles.bulkStatusMuted}>
                    Thumbnail {row.thumbnailFile ? "có" : "chưa có"}
                </span>
            </div>
        </div>
    );

    const renderItemBody = (row) => (
        <div className={styles.bulkItemBody}>
            <Row gutter={16}>
                <Col xs={24} lg={12}>
                    <span className={styles.quickFieldLabel}>Tên tài liệu</span>
                    <Input value={row.name} onChange={(e) => updateRow(row.key, { name: e.target.value })} />
                </Col>
                <Col xs={12} lg={6}>
                    <span className={styles.quickFieldLabel}>Giá</span>
                    <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        value={row.price}
                        onChange={(value) => updateRow(row.key, { price: value })}
                    />
                </Col>
                <Col xs={12} lg={6}>
                    <span className={styles.quickFieldLabel}>Thứ tự</span>
                    <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        value={row.orderNo}
                        onChange={(value) => updateRow(row.key, { orderNo: value })}
                    />
                </Col>
            </Row>

            <div className={styles.bulkFileStack}>
                {renderFileCard({
                    title: "File preview PDF",
                    checked: row.usePreview,
                    disabled: !row.pdfFile,
                    onCheck: (e) => updateRow(row.key, { usePreview: e.target.checked }),
                    fileName: row.pdfFile?.name,
                    accept: ".pdf",
                    onUpload: (file) => handleReplacePreview(row, file),
                    buttonText: row.pdfFile ? "Thay file preview" : "Upload file preview",
                    previewFile: row.pdfFile,
                    children: (
                        <>
                            {row.pdfImageStatus === "loading" && (
                                <div className={styles.bulkPdfImageStatus}>Đang tự tạo thumbnail và ảnh chi tiết từ PDF...</div>
                            )}
                            {row.pdfImageStatus === "error" && (
                                <div className={styles.bulkPdfImageError}>{row.pdfImageError}</div>
                            )}
                        </>
                    ),
                })}

                {renderFileCard({
                    title: "File tải",
                    checked: row.useDownload,
                    disabled: !row.downloadFile,
                    onCheck: (e) => updateRow(row.key, { useDownload: e.target.checked }),
                    fileName: row.downloadFile?.name,
                    accept: ".doc,.docx,.rar,.zip,.xlsx,.xls,.ppt,.pptx",
                    onUpload: (file) => handleReplaceDownload(row, file),
                    buttonText: row.downloadFile ? "Thay file tải" : "Upload file tải",
                })}

                <div className={styles.bulkFileCard}>
                    <span className={styles.quickFieldLabel}>Thumbnail</span>
                    <div className={styles.bulkThumbnailRow}>
                        <div className={styles.bulkThumbnailPreview}>
                            {row.thumbnailPreview ? (
                                <img src={row.thumbnailPreview} alt={row.thumbnailFile?.name || "thumbnail"} />
                            ) : (
                                <PictureOutlined />
                            )}
                        </div>
                        <div className={styles.bulkThumbnailActions}>
                            {row.thumbnailFile?.name && (
                                <div className={styles.bulkFileName}>{row.thumbnailFile.name}</div>
                            )}
                            <Upload
                                beforeUpload={(file) => handleReplaceThumbnail(row, file)}
                                showUploadList={false}
                                accept=".jpg,.jpeg,.png,.webp"
                                maxCount={1}
                            >
                                <Button size="small" className={styles.bulkReplaceButton}>
                                    {row.thumbnailFile ? "Thay ảnh" : "Upload ảnh"}
                                </Button>
                            </Upload>
                        </div>
                    </div>
                </div>

                <div className={styles.bulkFileCard}>
                    <span className={styles.quickFieldLabel}>Ảnh chi tiết (nhiều ảnh)</span>
                    <div className={styles.bulkDetailImagesBox}>
                        <Upload
                            multiple
                            beforeUpload={() => false}
                            showUploadList={false}
                            accept=".jpg,.jpeg,.png,.webp"
                            onChange={({ fileList }) => handleAddDetailImages(row, fileList)}
                        >
                            <button className={styles.bulkDetailUploadTile} type="button">
                                <span>+</span>
                                <span>Tải ảnh lên</span>
                            </button>
                        </Upload>
                        {(row.detailImages || []).map((image) => (
                            <div className={styles.bulkDetailImageTile} key={image.uid}>
                                <img src={image.preview} alt={image.name} />
                                <button type="button" onClick={() => removeDetailImage(row, image.uid)}>
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <Modal
            open={true}
            title="Đăng bài hàng loạt"
            onCancel={onClose}
            width="calc(100vw - 32px)"
            centered
            className={`${styles.documentDetailModal} ${styles.bulkMaxModal}`}
            styles={{ body: { height: "calc(100vh - 150px)", overflowY: "auto" } }}
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
                        <div style={{ display: "flex", gap: 8 }}>
                            <Select
                                showSearch
                                allowClear
                                value={selectedParentId === guidEmpty ? undefined : selectedParentId}
                                placeholder="Chọn tài liệu cha"
                                loading={parentLoading}
                                filterOption={false}
                                onSearch={(value) => {
                                    setParentSearchTerm(value);
                                    fetchParentOptions(value, undefined, parentSearchMode === "key");
                                }}
                                onChange={handleParentChange}
                                options={parentOptions}
                                style={{ width: "100%" }}
                            />
                            <Select
                                value={parentSearchMode}
                                style={{ width: 140 }}
                                options={[
                                    { value: "full", label: "Tìm đầy đủ" },
                                    { value: "key", label: "Dùng khóa" },
                                ]}
                                onChange={(value) => {
                                    setParentSearchMode(value);
                                    fetchParentOptions(parentSearchTerm, undefined, value === "key");
                                }}
                            />
                        </div>
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
                        accept=".pdf,.doc,.docx,.rar,.zip,.xlsx,.xls,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                        onChange={({ fileList }) =>
                            setRows((prevRows) => mergeRowsWithPrevious(buildRowsFromFiles(fileList, defaults), prevRows))
                        }
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

                <Collapse
                    key={rows.map((row) => row.key).join("|")}
                    className={styles.bulkItemCollapse}
                    bordered={false}
                    defaultActiveKey={rows.slice(0, 3).map((row) => row.key)}
                    items={rows.map((row, index) => ({
                        key: row.key,
                        label: renderItemHeader(row, index),
                        extra: (
                            <Button
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    removeRow(row.key);
                                }}
                            />
                        ),
                        children: renderItemBody(row),
                    }))}
                />
            </div>
        </Modal>
    );
};

export default BulkCreateDocument;
