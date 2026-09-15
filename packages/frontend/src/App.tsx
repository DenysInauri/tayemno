import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RouteEnum } from "./enums/routing/RouteEnum";
import { SignInPage } from "./pages/SignInPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { AuthProvider } from "./contexts/AuthContext";
import { GuestRoute } from "./components/routing/GuestRoute";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";
import { HomePage } from "./pages/HomePage";

export const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path={RouteEnum.SIGN_IN} element={<SignInPage />} />
          <Route path={RouteEnum.SIGN_UP} element={<RegisterPage />} />
          <Route path={RouteEnum.VERIFY_EMAIL} element={<VerifyEmailPage />} />
          <Route
            path={RouteEnum.FORGOT_PASSWORD}
            element={<ForgotPasswordPage />}
          />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path={RouteEnum.HOME} element={<HomePage />} />
        </Route>
        <Route path="*" element={<Navigate to={RouteEnum.HOME} replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);
