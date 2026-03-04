import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';
import { Industry, Role } from '@nexus/shared';
import { NotificationService } from '../services/NotificationService';

interface User {
    id: string;
    email: string;
    role: Role;
    industry?: Industry;
    tenantId?: string;
    channel: 'MOBILE';
}

interface MfaChallenge {
    mfaRequired: true;
    mfaSessionToken: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    /** Returns MfaChallenge if MFA is required, or void if login is complete */
    login: (email: string, password: string) => Promise<MfaChallenge | void>;
    /** MOB-008: Completes login after TOTP verification by storing the final JWT */
    loginWithToken: (accessToken: string) => Promise<void>;
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

                // MOB-005: Refresh push token on session load
                NotificationService.registerForPushNotificationsAsync().then(token => {
                    if (token) NotificationService.uploadToken(token);
                });
            }
        } catch (e) {
            console.error('Failed to load session', e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string): Promise<MfaChallenge | void> => {
        const response = await client.post('/auth/login/mobile', { email, password });
        const { accessToken, refreshToken, user: userData, mfaRequired, mfaSessionToken } = response.data;

        // MOB-008: Server signals MFA is required — do NOT store token yet
        if (mfaRequired && mfaSessionToken) {
            return { mfaRequired: true, mfaSessionToken };
        }

        await SecureStore.setItemAsync('nexus_mobile_token', accessToken);
        if (refreshToken) {
            await SecureStore.setItemAsync('nexus_mobile_refresh_token', refreshToken);
        }
        await SecureStore.setItemAsync('nexus_mobile_user', JSON.stringify(userData));

        setToken(accessToken);
        setUser(userData);

        // MOB-005: Register push token after successful login
        NotificationService.registerForPushNotificationsAsync().then(token => {
            if (token) NotificationService.uploadToken(token);
        }).catch(() => void 0);
    };

    /**
     * MOB-008: Called after successful TOTP verification to finalise the session.
     * Fetches the full user profile using the final accessToken, then stores it.
     */
    const loginWithToken = async (accessToken: string): Promise<void> => {
        await SecureStore.setItemAsync('nexus_mobile_token', accessToken);
        // Temporarily set token so the profile request is authenticated
        setToken(accessToken);

        try {
            const profileRes = await client.get('/auth/me', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const userData = profileRes.data;
            await SecureStore.setItemAsync('nexus_mobile_user', JSON.stringify(userData));
            setUser(userData);
        } catch {
            // If profile fetch fails, session is still valid — user will load on next app open
        }

        NotificationService.registerForPushNotificationsAsync().then(t => {
            if (t) NotificationService.uploadToken(t);
        }).catch(() => void 0);
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('nexus_mobile_token');
        await SecureStore.deleteItemAsync('nexus_mobile_refresh_token');
        await SecureStore.deleteItemAsync('nexus_mobile_user');
        setToken(null);
        setUser(null);
    };

    const selectTenant = async (tenantId: string) => {
        const response = await client.post('/auth/select-tenant', { tenantId });
        const { accessToken, refreshToken, user: userData } = response.data;

        await SecureStore.setItemAsync('nexus_mobile_token', accessToken);
        if (refreshToken) {
            await SecureStore.setItemAsync('nexus_mobile_refresh_token', refreshToken);
        }
        await SecureStore.setItemAsync('nexus_mobile_user', JSON.stringify(userData));

        setToken(accessToken);
        setUser(userData);

        // MOB-005: Refresh push token on tenant change
        NotificationService.registerForPushNotificationsAsync().then(token => {
            if (token) NotificationService.uploadToken(token);
        }).catch(() => void 0);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, loginWithToken, logout, selectTenant }}>
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
