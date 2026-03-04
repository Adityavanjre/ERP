import axios from 'axios';
import API_URL from './config';

/**
 * SEC-008: Centralized Axios instance for Agency Frontend.
 * Automatically injects the JWT token from localStorage and handles common logic.
 */
const api = axios.create({
    baseURL: API_URL,
});

// Request interceptor for token injection
api.interceptors.request.use(
    (config) => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const { token } = JSON.parse(userInfo);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for global error handling (e.g., 401 logout)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn('Unauthorized access detected, clearing session...');
            localStorage.removeItem('userInfo');
            // Optional: window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
