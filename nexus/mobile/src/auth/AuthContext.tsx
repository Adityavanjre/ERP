import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';
import { Industry, Role } from '@nexus/shared';

interface User {
    id: string;
    email: string;
    role: Role;
    industry?: Industry;
    tenantId?: string;
    channel: 'MOBILE';
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    selectTenant: (tenantId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSession();
    }, []);

    const loadSession = async () => {
        try {
            const storedToken = await SecureStore.getItemAsync('nexus_mobile_token');
            const storedUser = await SecureStore.getItemAsync('nexus_mobile_user');

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            }
        } catch (e) {
            console.error('Failed to load session', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        const response = await client.post('/auth/login/mobile', { email, password });
        const { accessToken, user: userData } = response.data;

        await SecureStore.setItemAsync('nexus_mobile_token', accessToken);
        await SecureStore.setItemAsync('nexus_mobile_user', JSON.stringify(userData));

        setToken(accessToken);
        setUser(userData);
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('nexus_mobile_token');
        await SecureStore.deleteItemAsync('nexus_mobile_user');
        setToken(null);
        setUser(null);
    };

    const selectTenant = async (tenantId: string) => {
        const response = await client.post('/auth/select-tenant', { tenantId });
        const { accessToken, user: userData } = response.data;

        await SecureStore.setItemAsync('nexus_mobile_token', accessToken);
        await SecureStore.setItemAsync('nexus_mobile_user', JSON.stringify(userData));

        setToken(accessToken);
        setUser(userData);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, selectTenant }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
