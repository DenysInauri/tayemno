import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { RouteEnum } from "../../../enums/routing/RouteEnum";

export const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to={RouteEnum.SIGN_IN} replace />;

  if (
    user?.forcePasswordChange &&
    location.pathname !== RouteEnum.CHANGE_PASSWORD
  ) {
    return <Navigate to={RouteEnum.CHANGE_PASSWORD} replace />;
  }

  return <Outlet />;
};
