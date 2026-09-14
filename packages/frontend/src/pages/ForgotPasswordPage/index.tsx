import { useTranslation } from "react-i18next";
import { Container } from "../../components/ui/Container";
import { Stack } from "../../components/ui/Stack";
import { Title } from "../../components/ui/Title";
import { SizeEnum } from "../../enums/ui/SizeEnum";

export const ForgotPasswordPage = () => {
  const { t } = useTranslation();

  return (
    <Container size={500} px={SizeEnum.LG}>
      <Stack justify="center" mih="100vh" py={SizeEnum.XL}>
        <Title ta="center" order={1}>
          {t("forgotPassword.title")}
        </Title>
      </Stack>
    </Container>
  );
};
