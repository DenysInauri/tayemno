import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { RouteEnum } from "../../../enums/routing/RouteEnum";

export const GuestRoute = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to={RouteEnum.HOME} replace />;
  return <Outlet />;
};
