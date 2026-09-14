import { useState } from "react";
import { RegisterPage } from "./pages/RegisterPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";

export const App = () => {
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);

  if (verifyEmail) {
    return <VerifyEmailPage email={verifyEmail} />;
  }

  return <RegisterPage onRegistered={setVerifyEmail} />;
};
