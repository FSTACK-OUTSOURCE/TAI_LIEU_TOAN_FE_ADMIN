"use client"
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect, useState } from 'react';
import { Table, Tag, Input } from 'antd';
import { BellOutlined, SearchOutlined } from '@ant-design/icons';
import { getUserInfos } from '@/app/Api/apiRegistration';
import { FormatDateTime } from '@/app/constans';

const { Search } = Input;

const JOB_LABELS = { gv: 'Giáo viên / GV', hs: 'Học sinh / SV', ph: 'Phụ huynh', k: 'Khác' };
const LEVEL_LABELS = { th: 'Tiểu học', cs: 'THCS', pt: 'THPT', dh: 'Đại học', ch: 'Cao học' };

export default function NotificationPage() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [keyword, setKeyword] = useState('');
    const pageSize = 20;

    const fetchData = async (currentPage = 1, kw = keyword) => {
        const params = { CurrentPage: currentPage, PageSize: pageSize };
        if (kw) params.KEYWORD = kw;
        const res = await getUserInfos(params);
        if (res.success) {
            setData((res.Items || []).map((item, idx) => ({
                ...item,
                key: item.USER_INFO_ID,
                STT: (currentPage - 1) * pageSize + idx + 1,
            })));
            setTotal(res.TotalCount || 0);
        }
    };

    const onSearch = (value) => {
        setKeyword(value);
        setPage(1);
        fetchData(1, value);
    };

    const onPageChange = (p) => {
        setPage(p);
        fetchData(p, keyword);
    };

    useEffect(() => { fetchData(1, ''); }, []);

    const columns = [
        { title: 'STT', dataIndex: 'STT', width: 60 },
        { title: 'Email', dataIndex: 'EMAIL', width: 220 },
        { title: 'SĐT', dataIndex: 'PHONE_NUMBER', width: 140 },
        {
            title: 'Đối tượng', dataIndex: 'JOB', width: 180,
            render: (val) => val ? <Tag color="blue">{JOB_LABELS[val] || val}</Tag> : '—',
        },
        {
            title: 'Cấp học', dataIndex: 'LEVEL', width: 120,
            render: (val) => val ? <Tag color="orange">{LEVEL_LABELS[val] || val}</Tag> : '—',
        },
        {
            title: 'Ngày tạo', dataIndex: 'CREATED_DATE', width: 160,
            render: (val) => val ? FormatDateTime(new Date(val)) : '—',
        },
    ];

    return (
        <div className="p-4">
            <div className="d-flex align-items-center gap-2 mb-3">
                <BellOutlined style={{ fontSize: 22, color: '#fa8c16' }} />
                <h5 className="mb-0">Danh sách đăng ký</h5>
                <span style={{ background: '#fa8c16', color: '#fff', borderRadius: 10, padding: '0 8px', fontSize: 12 }}>
                    {total}
                </span>
            </div>

            <div className="mb-3">
                <Search
                    placeholder="Tìm theo email hoặc số điện thoại..."
                    allowClear
                    enterButton={<SearchOutlined />}
                    style={{ maxWidth: 400 }}
                    onSearch={onSearch}
                />
            </div>

            <Table
                columns={columns}
                dataSource={data}
                pagination={{
                    current: page,
                    pageSize,
                    total,
                    onChange: onPageChange,
                    showTotal: (t) => `Tổng ${t} người`,
                }}
                bordered
                size="middle"
            />
        </div>
    );
}
