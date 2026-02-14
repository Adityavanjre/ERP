import { createContext, useState, useContext, type ReactNode } from 'react';
import axios from 'axios';
import API_URL from '../api/config';

interface User {
    _id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    token: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: async () => { },
    logout: () => { },
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
            const { data } = await axios.post(`${API_URL}/api/users/login`, {
                email,
                password,
            });
            setUser(data);
            localStorage.setItem('userInfo', JSON.stringify(data));
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || 'Login failed');
            } else if (error instanceof Error) {
                throw new Error(error.message);
            } else {
                throw new Error('Login failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('userInfo');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
