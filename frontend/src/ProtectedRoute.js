import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthGuard = ({ requiredRole, userRole, children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (userRole === null) {
      navigate("/", { replace: true });
    } else if (userRole !== requiredRole) {
      navigate("/", { replace: true });
    }
  }, [userRole, requiredRole, navigate]);

  if (userRole === requiredRole) {
    return children;
  }

  return null;
};

export default AuthGuard;