import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

export const useQuery = <T>(url: string) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (retryCount = 0) => {
        setLoading(retryCount === 0);
        setError(null);
        try {
            const response = await client.get(url);
            setData(response.data);
            setLoading(false);
        } catch (err: any) {
            const isNetworkError = !err.response && err.message !== 'canceled';
            if (isNetworkError && retryCount < 3) {
                setTimeout(() => fetchData(retryCount + 1), 1000);
            } else {
                setError(err.response?.data?.message || err.message || 'Failed to fetch data');
                setLoading(false);
            }
        }
    }, [url]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: () => fetchData() };
};
