import axios from 'axios';
import API_URL from './config';

/**
 * SEC-008: Centralized Axios instance for Agency Frontend.
 * Automatically injects the JWT token from localStorage and handles common logic.
 */
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// Request interceptor removed (no longer needed for cookie-based auth)


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
