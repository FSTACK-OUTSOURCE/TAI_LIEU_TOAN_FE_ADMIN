'use client'
import 'react-quill/dist/quill.snow.css';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import axios from 'axios';

const QuillEditor = dynamic(() => import('react-quill'), { ssr: false });

const getCookie = (name) =>
    document.cookie.split('; ').find(r => r.startsWith(`${name}=`))?.split('=')[1] ?? null;

export const ReactQuill = ({ onChange, ...props }) => {
    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                [{ color: [] }, { background: [] }],
                ['link', 'image'],
                ['clean'],
            ],
            handlers: {
                image: function () {
                    // `this.quill` is the Quill editor instance — works regardless of how ref is set up
                    const quill = this.quill;
                    const savedRange = quill.getSelection();

                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'image/*');
                    input.click();

                    input.onchange = async () => {
                        const file = input.files?.[0];
                        if (!file) return;

                        const formData = new FormData();
                        formData.append('file', file);

                        try {
                            const token = getCookie('token');
                            const res = await axios.post(
                                `${process.env.NEXT_PUBLIC_API_URL}/api/file/upload`,
                                formData,
                                {
                                    headers: {
                                        'Content-Type': 'multipart/form-data',
                                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                    },
                                }
                            );

                            const filePath = res.data?.FilePath;
                            if (filePath) {
                                const url = filePath.replace(/\\/g, '/'); // /uploads/abc.png
                                const index = savedRange?.index ?? quill.getLength() - 1;
                                quill.insertEmbed(index, 'image', url);
                                quill.setSelection(index + 1, 0);
                            }
                        } catch (err) {
                            console.error('Image upload failed', err);
                        }
                    };
                },
            },
        },
    }), []);

    return (
        <QuillEditor
            theme="snow"
            modules={modules}
            onChange={onChange}
            {...props}
        />
    );
};
