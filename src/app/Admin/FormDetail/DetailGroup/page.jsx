'use client'
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from "../../../page.module.css";
import { Spin, Select, Button, Tag } from 'antd';
import { useState, useEffect } from 'react';
import { saveGroups, getGroups } from '@/app/Api/apiGroup';
import { getDocumentInfo, getParentDocuments } from '@/app/Api/apiDocument';
import { guidEmpty } from '@/app/constans'
import { useRouter } from 'next/navigation'
import { CloseCircleOutlined } from '@ant-design/icons';


const DetailGroup = (props) => {
    const { onClose, groupId } = props
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState([]);
    const [documentTags, setDocumentTags] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");


    const getData = async (groupId) => {
        if (groupId) {
            const queryParams = { GROUP_ID: groupId, Columns: '*' };
            var response = await getGroups(queryParams);
            if (response.success && response.Items && response.Items.length > 0) {
                setData(response.Items[0])
                bindDocuments(response.Items[0].DOCUMENT_IDS)
            }
            else {
                setData({})
            }
        }
    }
    const bindDocuments = async (ids) => {
        const queryParams = { DOCUMENT_IDS: ids, Columns: '*', CurrentPage: 1, PageSize: 100 };
        var response = await getDocumentInfo(queryParams, false);
        if (response.success && response.Items) {
            setDocumentTags(response.Items.map((x) => ({ label: x.NAME, value: x.DOCUMENT_ID, ...x })))
        }
        else {
            setDocumentTags([])
        }
    }

    const onChange = (data) => {
        setData(data)
    };

    const onSave = async () => {
        const response = await saveGroups(data);
        if (response.success) {
            onClose();
        }
    }

    const setDocument = (value) => {
        if (value) {
            var ids = data.DOCUMENT_IDS?.split(',') || []
            setData({...data, DOCUMENT_IDS: [...ids, value].join(',')})
        }
    }
    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            fetchOptions(searchTerm);
        }
    };

    const initOptions = async (props) => {
        const { search } = props
        const queryParams = { NAME: search, Columns: '*', CurrentPage: 1, PageSize: 10 };
        var response = await getDocumentInfo(queryParams);
        setOptions(response.Items.map(x => ({
            value: x.DOCUMENT_ID,
            label: `${x.NAME} - ${x.IDENTITY_KEY}`,
        })));
    }
    const fetchOptions = async (search) => {
        if (!search) return;
        // if (isNaN(search)) return;
        initOptions({ search })
        setLoading(true);
        try {

        } catch (error) {
            console.error("Error fetching options:", error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        getData(groupId);
    }, [groupId])

    
    useEffect(() => {
        bindDocuments(data.DOCUMENT_IDS);
    }, [data.DOCUMENT_IDS])

    return (
        <div className={`${styles.overlay} ${styles.sizePopUp}`}>
            <div className={styles.popupDocument}>
                <div className="col-lg-12 col-xl-12">
                    <div className="justify-content-center">
                        <p className="text-center h5 pt-3 pb-3 fw-bold mb-3 mx-1 mx-md-4">{data?.GROUP_ID ? 'Cập nhật' : 'Thêm mới'} bộ tài liệu</p>

                        <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1">
                            <div className="d-flex flex-row align-items-center mb-4">
                                <div className="form-outline flex-fill mb-0">
                                    <label>Tên bộ tài liệu</label>
                                    <input type="text" className="form-control" placeholder='Nhập tên bộ tài liệu' value={data?.GROUP_NAME} onChange={(e) => {
                                        onChange({ ...data, GROUP_NAME: e.target.value })
                                    }} />
                                </div>
                            </div>

                        </div>
                        <div className={`col-md-12 ${styles.transparentTable}`}>
                            <div className="d-flex flex-row align-items-center mb-4">
                                <div className="form-outline flex-fill mb-0">
                                    <label>Thứ tự hiển thị</label>
                                    <input type="number" min={0} className="form-control" placeholder='Nhập số thứ tự' value={data?.ORDER_NO} onChange={(e) => {
                                        onChange({ ...data, ORDER_NO: e.target.value })
                                    }} />
                                </div>
                            </div>

                        </div>
                        <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1">
                            <div className="d-flex flex-row align-items-center mb-4">
                                <div className="form-outline flex-fill mb-0">
                                    <label>Tài liệu</label>
                                    <Select
                                        showSearch
                                        value={""}
                                        placeholder="Nhập khóa tài liệu"
                                        notFoundContent={loading ? <Spin size="small" /> : "No data"}
                                        filterOption={false} // Prevent default filtering
                                        onKeyDown={handleKeyDown} // Fetch options dynamically
                                        onChange={(value) => {
                                            setDocument(value)
                                        }}
                                        onSearch={setSearchTerm}
                                        options={(options || []).map((d) => ({
                                            value: d.value,
                                            label: d.label,
                                        }))}
                                        style={{ width: '100%', height: '40px' }}
                                    >
                                    </Select>
                                </div>
                            </div>

                        </div>
                        {
                            data.DOCUMENT_IDS?.split(',').filter((x) => x).map((x) =>
                                <Tag key={x} style={{ fontSize: '20px', margin: '5px' }} closeIcon={<CloseCircleOutlined />} onClose={() => {
                                    var documentIds = data.DOCUMENT_IDS?.split(',').filter((z) => z != x)
                                    onChange({ ...data, DOCUMENT_IDS: documentIds.join(',') })
                                    setOptions([])
                                    setSearchTerm("")
                                }}>
                                    {`${documentTags.find((y) => y.DOCUMENT_ID == x)?.NAME}-${documentTags.find((y) => y.DOCUMENT_ID == x)?.IDENTITY_KEY}`}
                                </Tag>

                            )
                        }


                        <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1">

                            <div className="d-flex justify-content-center mx-4 mb-3 mb-lg-4">
                                <button type="button" className={`btn btn-success btn-md ${styles.m3}`} onClick={onSave}>Lưu</button>
                                <button type="button" className={`btn btn-primary btn-md ${styles.m3}`} onClick={onClose}>Đóng</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailGroup;
