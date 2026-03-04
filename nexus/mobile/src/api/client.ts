import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

client.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('nexus_mobile_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = await SecureStore.getItemAsync('nexus_mobile_refresh_token');
                if (refreshToken) {
                    const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                    const { accessToken, refreshToken: newRefreshToken } = response.data;

                    await SecureStore.setItemAsync('nexus_mobile_token', accessToken);
                    if (newRefreshToken) {
                        await SecureStore.setItemAsync('nexus_mobile_refresh_token', newRefreshToken);
                    }

                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return client(originalRequest);
                }
            } catch (refreshError) {
                // If refresh fails, clear everything and force logout
                await SecureStore.deleteItemAsync('nexus_mobile_token');
                await SecureStore.deleteItemAsync('nexus_mobile_refresh_token');
                await SecureStore.deleteItemAsync('nexus_mobile_user');
            }
        }

        return Promise.reject(error);
    }
);

export default client;
