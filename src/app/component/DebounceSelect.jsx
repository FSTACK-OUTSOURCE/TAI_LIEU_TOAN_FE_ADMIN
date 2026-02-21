'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { Select, Spin } from 'antd';
import debounce from 'lodash/debounce';

function combineUniqueObjects(array1, array2, uniqueKey) {
    const map = new Map();

    array1.concat(array2).forEach(obj => {
        map.set(obj[uniqueKey], obj);
    });

    return Array.from(map.values());
}

export const DebounceSelect = ({ fetchOptions, initialValues, onChange, ...props }) => {
    const [options, setOptions] = useState([]);
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [search, setSearch] = useState(null);

    const fetchData = async ({ initialValues, search }) => {
        var data = [];
        if (initialValues) {
            const initData = await fetchOptions(initialValues, search);
            data = initData;
        }
        const filteredData = await fetchOptions(null, search);

        data = combineUniqueObjects(data, filteredData, 'value');
        setOptions(data);
        setFetching(false);
    };
    const debouncedFetchData = useMemo(() => debounce(fetchData, 800), []);

    useEffect(() => {
        if (initialValues && initialValues.length > 0) {
            var ids = initialValues.split(',').map(x => ({ value: x }))
            setSelectedOptions(ids);
        }
    }, [initialValues]);


    useEffect(() => {
        debouncedFetchData({ initialValues, search });
    }, [search, initialValues]);


    // Handle search input change
    const handleSearch = (key) => {
        setSearch(key);
    };

    const handleChange = (selected) => {
        onChange(selected);
        setSelectedOptions(selected);
    };

    return (
        <Select
            showSearch
            labelInValue
            onSearch={handleSearch}
            filterOption={false}
            notFoundContent={fetching ? <Spin size="small" /> : null}
            options={options}
            onChange={handleChange}
            value={selectedOptions}
            {...props}
        />
    );
};

