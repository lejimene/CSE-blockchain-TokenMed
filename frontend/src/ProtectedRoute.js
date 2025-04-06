import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, requiredRole, userRole }) => {
    if (userRole !== requiredRole) {
        return <Navigate to="/" replace />;
    }
    return children;
};

export default ProtectedRoute;
