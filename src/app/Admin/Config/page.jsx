"use client";
import { getClientSideCookie } from "@/app/Api";
import { getConfigs, saveConfigs } from "@/app/Api/apiConfig";
import { ReactQuill } from "@/app/Component/TextEditor";
import { PlusOutlined } from "@ant-design/icons";
import { Image, Upload } from "antd";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState } from "react";

const getBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

export default function ManageConfig() {
    const [data, setData] = useState([]);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState("");
    const [fileLogo, setFileLogo] = useState([]);
    const [fileBanners, setFileBanners] = useState([]);
    const [info, setInfo] = useState({});

    useEffect(() => {
        GetData();
    }, []);

    const GetData = async () => {
        var response = await getConfigs();
        if (response.success && response.Items && response.Items.length > 0) {
            setData(response.Items);
            setFileBanners(
                response.Items.filter((x) => x.CONFIG_NAME == "banner").map(
                    (x) => ({
                        uid: x.CONFIG_ID,
                        id: x.CONFIG_ID,
                        name: "image.png",
                        status: "done",
                        url: `${process.env.NEXT_PUBLIC_API_URL}${x.CONFIG_VALUE}`,
                    }),
                ),
            );
            setFileLogo(
                response.Items.filter((x) => x.CONFIG_NAME == "logo").map(
                    (x) => ({
                        uid: x.CONFIG_ID,
                        id: x.CONFIG_ID,
                        name: "image.png",
                        status: "done",
                        url: `${process.env.NEXT_PUBLIC_API_URL}${x.CONFIG_VALUE}`,
                    }),
                ),
            );

            setInfo({
                logo: response.Items.find((x) => x.CONFIG_NAME == "logo")
                    ?.CONFIG_VALUE,
                hotline: response.Items.find((x) => x.CONFIG_NAME == "hotline")
                    ?.CONFIG_VALUE,
                zalo: response.Items.find((x) => x.CONFIG_NAME == "zalo")
                    ?.CONFIG_VALUE,
                facebook: response.Items.find(
                    (x) => x.CONFIG_NAME == "facebook",
                )?.CONFIG_VALUE,
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await saveConfigs({ Configs: data });
    };

    const handlePreview = async (file) => {
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj);
        }

        setPreviewImage(file.url || file.preview);
        setPreviewOpen(true);
    };

    const onChange = (data) => {
        setData(data);

        setInfo({
            logo: data.find((x) => x.CONFIG_NAME == "logo")?.CONFIG_VALUE,
            hotline: data.find((x) => x.CONFIG_NAME == "hotline")?.CONFIG_VALUE,
            zalo: data.find((x) => x.CONFIG_NAME == "zalo")?.CONFIG_VALUE,
            facebook: data.find((x) => x.CONFIG_NAME == "facebook")
                ?.CONFIG_VALUE,
        });
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

    return (
        <>
            <div className="container mt-5">
                <div className="card">
                    <div className="card-header text-center">
                        <h1>Thông tin cấu hình</h1>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="form-group mb-3">
                                <label>Ảnh logo</label>
                                <Upload
                                    customRequest={uploadFile}
                                    listType="picture-card"
                                    fileList={fileLogo}
                                    accept="image/*"
                                    multiple={true}
                                    onPreview={handlePreview}
                                    onChange={({ fileList: newFileList }) => {
                                        setFileLogo(newFileList);
                                        var banners = newFileList.filter(
                                            (x) => x.status == "done",
                                        );
                                        var newData = data.filter(
                                            (x) => x.CONFIG_NAME != "logo",
                                        );
                                        if (banners && banners.length > 0) {
                                            newData = newData.concat(
                                                banners.map((x) => ({
                                                    CONFIG_ID: x.id,
                                                    CONFIG_NAME: "logo",
                                                    CONFIG_VALUE:
                                                        x.response.FilePath,
                                                })),
                                            );
                                        }
                                        onChange(newData);
                                    }}
                                >
                                    {fileLogo.length > 0 ? null : uploadButton}
                                </Upload>
                                {previewImage && (
                                    <Image
                                        wrapperStyle={{ display: "none" }}
                                        preview={{
                                            visible: previewOpen,
                                            onVisibleChange: (visible) =>
                                                setPreviewOpen(visible),
                                            afterOpenChange: (visible) =>
                                                !visible && setPreviewImage(""),
                                        }}
                                        src={previewImage}
                                    />
                                )}
                            </div>
                            <div className="form-group mb-3">
                                <label>Ảnh banner</label>
                                <Upload
                                    customRequest={uploadFile}
                                    listType="picture-card"
                                    fileList={fileBanners}
                                    accept="image/*"
                                    multiple={true}
                                    onPreview={handlePreview}
                                    onChange={({ fileList: newFileList }) => {
                                        setFileBanners(newFileList);
                                        var banners = newFileList.filter(
                                            (x) => x.status == "done",
                                        );
                                        var newData = data.filter(
                                            (x) => x.CONFIG_NAME != "banner",
                                        );
                                        if (banners && banners.length > 0) {
                                            newData = newData.concat(
                                                banners.map((x) => ({
                                                    CONFIG_ID: x.id,
                                                    CONFIG_NAME: "banner",
                                                    CONFIG_VALUE:
                                                        x.response.FilePath,
                                                })),
                                            );
                                        }
                                        onChange(newData);
                                    }}
                                >
                                    {uploadButton}
                                </Upload>
                                {previewImage && (
                                    <Image
                                        wrapperStyle={{ display: "none" }}
                                        preview={{
                                            visible: previewOpen,
                                            onVisibleChange: (visible) =>
                                                setPreviewOpen(visible),
                                            afterOpenChange: (visible) =>
                                                !visible && setPreviewImage(""),
                                        }}
                                        src={previewImage}
                                    />
                                )}
                            </div>
                            <div className="form-group mb-3">
                                <label>Hotline</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={info.hotline}
                                    onChange={(e) => {
                                        var hotline = data.find(
                                            (x) => x.CONFIG_NAME == "hotline",
                                        );
                                        hotline
                                            ? (hotline.CONFIG_VALUE =
                                                  e.target.value)
                                            : data.push({
                                                  CONFIG_NAME: "hotline",
                                                  CONFIG_VALUE: e.target.value,
                                              });
                                        onChange(data);
                                    }}
                                />
                            </div>
                            <div className="form-group mb-3">
                                <label>Link zalo</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={info.zalo}
                                    onChange={(e) => {
                                        var zalo = data.find(
                                            (x) => x.CONFIG_NAME == "zalo",
                                        );
                                        zalo
                                            ? (zalo.CONFIG_VALUE =
                                                  e.target.value)
                                            : data.push({
                                                  CONFIG_NAME: "zalo",
                                                  CONFIG_VALUE: e.target.value,
                                              });
                                        onChange(data);
                                    }}
                                />
                            </div>
                            <div className="form-group mb-3">
                                <label>Link facebook</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={info.facebook}
                                    onChange={(e) => {
                                        var facebook = data.find(
                                            (x) => x.CONFIG_NAME == "facebook",
                                        );
                                        facebook
                                            ? (facebook.CONFIG_VALUE =
                                                  e.target.value)
                                            : data.push({
                                                  CONFIG_NAME: "facebook",
                                                  CONFIG_VALUE: e.target.value,
                                              });
                                        onChange(data);
                                    }}
                                />
                            </div>
                            <div className="form-group mb-3">
                                <label>Thông tin footer</label>
                                <ReactQuill
                                    theme="snow"
                                    value={
                                        data.find(
                                            (x) => x.CONFIG_NAME == "footer",
                                        )?.CONFIG_VALUE
                                    }
                                    onChange={(e) => {
                                        var footer = data.find(
                                            (x) => x.CONFIG_NAME == "footer",
                                        );
                                        footer
                                            ? (footer.CONFIG_VALUE = e)
                                            : data.push({
                                                  CONFIG_VALUE: "footer",
                                                  CONFIG_VALUE: e,
                                              });
                                        onChange(data);
                                    }}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary">
                                Lưu
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
