'use client'
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from "../../../page.module.css";
import { Checkbox } from 'antd';
import { useState, useEffect } from 'react';
import { postTopicInfo, getTopicInfo } from '@/app/Api/apiTopic';


const DetailTopic: React.FC<any> = ({ onClose, topicId }) => {
    const [data, setData] = useState<any>({});

    const GetData = async (topicId: string | null) => {
        if (topicId) {
            const queryParams = { TOPIC_ID: topicId, Columns: '*' };
            var response = await getTopicInfo(queryParams);
            if (response.success && response.Items && response.Items.length > 0) {
                setData(response.Items[0])
            }
            else {
                setData({})
            }
        }
    }


    const onChange = (data: any) => {
        setData(data)
    };

    const onSave = async () => {
        const response = await postTopicInfo(data);
        if (response.success) {
            onClose();
        }
    }

    useEffect(() => {
        GetData(topicId);
    }, [topicId])

    return (
        <div className={`${styles.overlay} ${styles.sizePopUp}`}>
            <div className={styles.popupDocument}>
                <div className="col-lg-12 col-xl-12">
                    <div className="row justify-content-center">
                        <p className="text-center h5 pt-3 pb-3 fw-bold mb-3 mx-1 mx-md-4">{data?.TOPIC_ID ? 'Cập nhật' : 'Thêm mới'} chủ đề</p>
                        <div className="col-md-12 col-lg-12 col-xl-12 order-2 order-lg-1">
                            <div className="d-flex flex-row align-items-center mb-4">
                                <div className="form-outline flex-fill mb-0">
                                    <label>Tên chủ đề</label>
                                    <input type="text" className="form-control" placeholder='Nhập tên chủ đề' value={data?.NAME} onChange={(e) => {
                                        onChange({ ...data, NAME: e.target.value })
                                    }} />
                                </div>
                            </div>
                            <div className="d-flex flex-row align-items-center mb-4">
                                <div className="form-outline mb-0">
                                    <Checkbox onChange={(e) => {
                                        onChange({ ...data, IS_PIN: !data.IS_PIN })
                                    }} checked={data?.IS_PIN}>Ghim</Checkbox>
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

export default DetailTopic;