
import styles from "../page.module.css";
import { FilterOutlined } from '@ant-design/icons';
import { Button, Form, Input, Space, List } from 'antd';
import { useState, useEffect } from "react";
export const Filter = ({ ...props }) => {
    const [showPopup, setShowPopup] = useState(false);
    const [filter, setFilterData] = useState({});
    return (
        <>
            {showPopup && <PopupFilter {...props} setShowPopup={setShowPopup} filter={filter} setFilterData={setFilterData} />}
            <Button className={`${styles.buttonFeature}`} onClick={() => {
                setShowPopup(true)
            }} type="primary" shape="round" icon={<FilterOutlined />} size='large'>
                Lọc
            </Button>
        </>
    )
}

const PopupFilter = ({ ...props }) => {
    const { setShowPopup, onFilter, filter, setFilterData } = props
    const onChange = (data) => {
        setFilterData(data)
    };
    let { columns } = props;
    return (
        <div className={`${styles.overlay} ${styles.sizePopUp}`}>
            <div className={styles.popup}>
                <Form
                    layout="vertical"
                    autoComplete="off"
                    style={{ width: 500 }}
                    size="large"
                >
                    <List grid={{
                        gutter: 10, column: 1
                    }}
                        dataSource={columns.filter(x => !x.hide)}
                        renderItem={column => (
                            <List.Item>
                                <Form.Item
                                    name={column.dataIndex}
                                    label={column.title}
                                >
                                    <Input placeholder={`Nhập ${column.title.toLowerCase()}`} defaultValue={filter[`${column.dataIndex}`]} onChange={(e) => {
                                        filter[`${column.dataIndex}`] = e.target.value;
                                        onChange({ ...filter })
                                    }} />
                                </Form.Item>
                            </List.Item>
                        )}
                    />


                    <div className="d-flex justify-content-center">
                        <Form.Item>
                            <Space>
                                <Button htmlType="button" className="btn btn-success" onClick={() => {
                                    onFilter(filter)
                                    setShowPopup(false)
                                }}>
                                    Lọc
                                </Button>
                                <Button htmlType="button" className="btn btn-primary" onClick={() => {
                                    setShowPopup(false)
                                }}>
                                    Đóng
                                </Button>
                            </Space>
                        </Form.Item>
                    </div>

                </Form>
            </div>
        </div>
    )
}

