import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore, isExpired } from '../../../context/store/authStore';
import { canAccessRoute } from '../../../config/permissions';

export default function ProtectedRoute() {
    const token      = useAuthStore((s) => s.token);
    const clearToken = useAuthStore((s) => s.clearToken);
    const location   = useLocation();

    if (!token) return <Navigate to="/login" state={{ from: location }} replace />;

    if (isExpired(token)) {
        clearToken();
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!canAccessRoute(location.pathname, token)) return <Navigate to="/" replace />;

    return <Outlet />;
}
