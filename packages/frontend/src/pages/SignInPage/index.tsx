import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Anchor } from "../../components/ui/Anchor";
import { Container } from "../../components/ui/Container";
import { Stack } from "../../components/ui/Stack";
import { Text } from "../../components/ui/Text";
import { Title } from "../../components/ui/Title";
import { RouteEnum } from "../../enums/routing/RouteEnum";
import { SizeEnum } from "../../enums/ui/SizeEnum";

export const SignInPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Container size={500} px={SizeEnum.LG}>
      <Stack justify="center" mih="100vh" py={SizeEnum.XL}>
        <Title ta="center" order={1}>
          {t("signIn.title")}
        </Title>
        <Text c="dimmed" size="sm" ta="center" mt={SizeEnum.XS}>
          {t("signIn.noAccount")}{" "}
          <Anchor
            size="sm"
            component="button"
            type="button"
            onClick={() => navigate(RouteEnum.SIGN_UP)}
          >
            {t("signIn.signUpLink")}
          </Anchor>
        </Text>
        <Text c="dimmed" size="sm" ta="center">
          <Anchor
            size="sm"
            component="button"
            type="button"
            onClick={() => navigate(RouteEnum.FORGOT_PASSWORD)}
          >
            {t("signIn.forgotPasswordLink")}
          </Anchor>
        </Text>
      </Stack>
    </Container>
  );
};
