import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Container } from "../../components/ui/Container";
import { Paper } from "../../components/ui/Paper";
import { PinInput } from "../../components/ui/PinInput";
import { Stack } from "../../components/ui/Stack";
import { Text } from "../../components/ui/Text";
import { Title } from "../../components/ui/Title";
import { RouteEnum } from "../../enums/routing/RouteEnum";
import { SizeEnum } from "../../enums/ui/SizeEnum";
import { usePostVerifyEmail } from "../../api/hooks/usePostVerifyEmail";
import { usePostResendVerification } from "../../api/hooks/usePostResendVerification";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

export const VerifyEmailPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email;

  if (!email) return <Navigate to={RouteEnum.SIGN_UP} replace />;

  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const { mutate: verify, isPending: isVerifying } = usePostVerifyEmail();
  const { mutate: resend, isPending: isResending } =
    usePostResendVerification();

  const handleVerify = () => {
    if (code.length !== 6) return;

    setError("");
    verify(
      { email, code },
      {
        onSuccess: () => {
          navigate(RouteEnum.SIGN_IN);
        },
        onError: (err) => {
          setError(getApiErrorMessage(err, t));
        },
      },
    );
  };

  const handleResend = () => {
    setError("");
    resend(
      { email },
      {
        onError: (err) => {
          setError(getApiErrorMessage(err, t));
        },
      },
    );
  };

  return (
    <Container size={500} px={SizeEnum.LG}>
      <Stack justify="center" mih="100vh" py={SizeEnum.XL}>
        <Title ta="center" order={1}>
          {t("verify.title")}
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={SizeEnum.XS}>
          {t("verify.subtitle", { email })}
        </Text>

        <Paper
          withBorder
          shadow="md"
          p={SizeEnum.LG}
          mt={SizeEnum.LG}
          radius="md"
        >
          <Stack align="center">
            <PinInput
              length={6}
              type="number"
              size="lg"
              value={code}
              onChange={setCode}
            />

            <Text c="red" size="sm" ta="center" opacity={error ? 1 : 0}>
              {error || "\u00A0"}
            </Text>

            <Button
              fullWidth
              mt={SizeEnum.SM}
              onClick={handleVerify}
              loading={isVerifying}
              disabled={code.length !== 6}
            >
              {t("verify.submitButton")}
            </Button>

            <Button
              fullWidth
              variant="subtle"
              onClick={handleResend}
              loading={isResending}
            >
              {t("verify.resendButton")}
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};
