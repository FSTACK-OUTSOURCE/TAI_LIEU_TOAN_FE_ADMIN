'use client'
import 'react-quill/dist/quill.snow.css';
import dynamic from 'next/dynamic';
import {  useMemo } from 'react';


export const ReactQuill = ({...props}) => {

    const ReactQuill = useMemo(() => dynamic(() => import('react-quill'), { ssr: false }), []);

    return (<ReactQuill theme="snow" {...props} />)
};


