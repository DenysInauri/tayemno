import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { RouteEnum } from "../../../enums/routing/RouteEnum";

export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Outlet />;
  return <Navigate to={RouteEnum.SIGN_IN} replace />;
};
