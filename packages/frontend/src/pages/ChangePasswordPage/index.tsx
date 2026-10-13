import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { Container } from "../../components/ui/Container";
import { Paper } from "../../components/ui/Paper";
import { Stack } from "../../components/ui/Stack";
import { Text } from "../../components/ui/Text";
import { Title } from "../../components/ui/Title";
import { ChangePasswordForm } from "../../components/ChangePasswordForm";
import { RouteEnum } from "../../enums/routing/RouteEnum";
import { SizeEnum } from "../../enums/ui/SizeEnum";
import { useAuth } from "../../contexts/AuthContext";

export const ChangePasswordPage = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  if (!user?.forcePasswordChange) {
    return <Navigate to={RouteEnum.HOME} replace />;
  }

  const handleSuccess = () => {
    updateUser({ forcePasswordChange: false });
    navigate(RouteEnum.HOME);
  };

  return (
    <Container size={480} px={SizeEnum.LG}>
      <Stack justify="center" mih="100vh" py={SizeEnum.XL}>
        <Title ta="center" order={1}>
          {t("changePassword.title")}
        </Title>
        <Text c="dimmed" size="sm" ta="center">
          {t("changePassword.subtitle")}
        </Text>
        <Paper withBorder shadow="md" p={SizeEnum.LG} radius="md">
          <ChangePasswordForm onSuccess={handleSuccess} />
        </Paper>
      </Stack>
    </Container>
  );
};
