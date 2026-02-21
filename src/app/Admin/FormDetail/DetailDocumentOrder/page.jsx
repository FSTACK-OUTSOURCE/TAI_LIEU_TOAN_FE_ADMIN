'use client'
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from "../../../page.module.css";
import { Checkbox, Select } from 'antd';
import { useState, useEffect } from 'react';
import { saveDocumentOrders, getDocumentOrders } from '@/app/Api/apiDocumentOrder';
import { getDocumentInfo } from '@/app/Api/apiDocument';


const DetailDocumentOrder = (props) => {
    const { onClose, documentOrderId } = props
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    const GetData = async (documentOrderId) => {
        if (documentOrderId) {
            const queryParams = { DOCUMENT_ORDER_ID: documentOrderId, Columns: '*' };
            var response = await getDocumentOrders(queryParams);
            if (response.success && response.Items && response.Items.length > 0) {
                setData(response.Items[0])
                await initOptions({ DOCUMENT_ID: response.Items[0].DOCUMENT_ID })
            }
            else {
                setData({})
            }
        }
    }
    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            fetchOptions(searchTerm);
        }
    };
    const fetchOptions = async (search) => {
        if (!search) return;
        initOptions({ search, DOCUMENT_ID: data?.DOCUMENT_ID })
        setLoading(true);
        try {

        } catch (error) {
            console.error("Error fetching options:", error);
        } finally {
            setLoading(false);
        }
    };
    const initOptions = async (props) => {
        const { search, DOCUMENT_ID } = props
        const queryParams = { IDENTITY_KEY: search, DOCUMENT_ID, Columns: '*', CurrentPage: 1, PageSize: 10 };
        var response = await getDocumentInfo(queryParams);
        setOptions(response.Items.map(x => ({
            value: x.DOCUMENT_ID,
            label: `${x.NAME} - ${x.IDENTITY_KEY}`,
        })));
    }

    const onChange = (data) => {
        setData(data)
    };

    const onSave = async () => {
        const response = await saveDocumentOrders(data);
        if (response.success) {
            onClose();
        }
    }

    useEffect(() => {
        GetData(documentOrderId);
    }, [documentOrderId])

    return (
        <div className={`${styles.overlay} ${styles.sizePopUp}`}>
            <div className={styles.popupDocument}>
                <div className="col-lg-12 col-xl-12">
                    <div className="row justify-content-center">
                        <p className="text-center h5 pt-3 pb-3 fw-bold mb-3 mx-1 mx-md-4">{data?.DOCUMENT_ORDER_ID ? 'Cập nhật' : 'Thêm mới'} tài liệu nổi bật</p>
                        <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1">
                            <div className="flex-row align-items-center mb-4">
                                <div className="form-outline mb-0">
                                    <label>Tài liệu</label>
                                    <Select
                                        showSearch
                                        value={data?.DOCUMENT_ID}
                                        placeholder="Nhập khóa tài liệu"
                                        notFoundContent={loading ? <Spin size="small" /> : "No data"}
                                        filterOption={false} // Prevent default filtering
                                        onKeyDown={handleKeyDown} // Fetch options dynamically
                                        onChange={(value) => {
                                            onChange({ ...data, DOCUMENT_ID: value })
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
                            <div className="d-flex flex-row align-items-center mb-4">
                                <div className="form-outline flex-fill mb-0">
                                    <label>Thứ tự</label>
                                    <input type="number" className="form-control" placeholder='Nhập số thứ tự' value={data?.ORDER_NO} onChange={(e) => {
                                        onChange({ ...data, ORDER_NO: e.target.value })
                                    }} />
                                </div>
                            </div>
                            <div className="d-flex flex-row align-items-center mb-4">
                                <div className="form-outline mb-0">
                                    <Checkbox onChange={(e) => {
                                        onChange({ ...data, IS_HIDDEN: !data.IS_HIDDEN })
                                    }} checked={data?.IS_HIDDEN}>Ẩn</Checkbox>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-10 col-lg-6 col-xl-6 order-2 order-lg-1">

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

export default DetailDocumentOrder;