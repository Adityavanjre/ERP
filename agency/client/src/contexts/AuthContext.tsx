import { createContext, useState, useContext, type ReactNode } from 'react';
import api from '../api';

interface User {
    _id: string;
    name: string;
    email: string;
    isAdmin: boolean;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: async () => { },
    logout: async () => { },
    isLoading: true
});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // ... context implementation
    const [user, setUser] = useState<User | null>(() => {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    });
    const [isLoading, setIsLoading] = useState(false);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            // SEC-008: Now uses cookies (withCredentials: true in api)
            const { data } = await api.post('users/login', {
                email,
                password,
            });
            setUser(data);
            localStorage.setItem('userInfo', JSON.stringify(data));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            throw new Error(err.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await api.post('users/logout');
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            localStorage.removeItem('userInfo');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
