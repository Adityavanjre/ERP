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
            // QA-005: True Exponential Backoff + Jitter to protect API Gateway from retry storms
            if (isNetworkError && retryCount < 4) {
                const backoffDelay = Math.min(1000 * Math.pow(2, retryCount) + Math.random() * 500, 10000);
                setTimeout(() => fetchData(retryCount + 1), backoffDelay);
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
