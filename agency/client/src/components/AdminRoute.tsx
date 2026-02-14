import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>; // Or return a loader component
    }

    return user && user.isAdmin ? <Outlet /> : <Navigate to="/login" replace />;
};

export default AdminRoute;
