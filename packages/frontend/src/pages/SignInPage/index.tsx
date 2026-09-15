import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import srp from "secure-remote-password/client";
import { useNavigate } from "react-router-dom";
import { Anchor } from "../../components/ui/Anchor";
import { Button } from "../../components/ui/Button";
import { Container } from "../../components/ui/Container";
import { Grid } from "../../components/ui/Grid";
import { GridCol } from "../../components/ui/GridCol";
import { Paper } from "../../components/ui/Paper";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Stack } from "../../components/ui/Stack";
import { Text } from "../../components/ui/Text";
import { TextInput } from "../../components/ui/TextInput";
import { Title } from "../../components/ui/Title";
import { RouteEnum } from "../../enums/routing/RouteEnum";
import { SizeEnum } from "../../enums/ui/SizeEnum";
import { usePostSignInInit } from "../../api/hooks/usePostSignInInit";
import { usePostSignInVerify } from "../../api/hooks/usePostSignInVerify";
import { signInSchema } from "../../validations/signInSchema";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { deriveKey } from "../../utils/crypto/deriveKey";
import { SymmetricCrypto } from "../../utils/crypto/SymmetricCrypto";
import { useAuth } from "../../contexts/AuthContext";

interface ISignInFormValues {
  identifier: string;
  password: string;
}

export const SignInPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutateAsync: signInInit } = usePostSignInInit();
  const { mutateAsync: signInVerify } = usePostSignInVerify();

  const formik = useFormik<ISignInFormValues>({
    initialValues: {
      identifier: "",
      password: "",
    },
    validationSchema: signInSchema,
    validateOnChange: true,
    validateOnBlur: false,
    onSubmit: async (values) => {
      setSubmitError("");
      setIsSubmitting(true);

      try {
        const initResponse = await signInInit({
          identifier: values.identifier,
        });

        const { username } = initResponse;

        const srpPrivateKey = srp.derivePrivateKey(
          initResponse.srpSalt,
          username,
          values.password,
        );

        const clientEphemeral = srp.generateEphemeral();

        const clientSession = srp.deriveSession(
          clientEphemeral.secret,
          initResponse.serverPublicEphemeral,
          initResponse.srpSalt,
          username,
          srpPrivateKey,
        );

        const verifyResponse = await signInVerify({
          username,
          clientPublicEphemeral: clientEphemeral.public,
          clientSessionProof: clientSession.proof,
        });

        srp.verifySession(
          clientEphemeral.public,
          clientSession,
          verifyResponse.serverSessionProof,
        );

        const kek = await deriveKey({
          password: values.password,
          saltHex: verifyResponse.user.kdfSalt,
          iterations: verifyResponse.user.kdfIterations,
          memoryLimit: verifyResponse.user.kdfMemoryKib * 1024,
        });

        const privateKey = await SymmetricCrypto.decrypt(
          {
            ciphertext: verifyResponse.user.encryptedPrivateKey,
            nonce: verifyResponse.user.privateKeyNonce,
          },
          kek,
        );

        signIn(verifyResponse.token, verifyResponse.user, {
          publicKey: verifyResponse.user.publicKey,
          privateKey,
        });
        navigate(RouteEnum.HOME);
      } catch (err: any) {
        setSubmitError(getApiErrorMessage(err, t));
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleBlur = (fieldName: string) => () => {
    formik.setFieldTouched(fieldName, true);
  };

  return (
    <Container size={900} px={SizeEnum.LG}>
      <Stack justify="center" mih="100vh" py={SizeEnum.XL}>
        <Grid gutter={SizeEnum.XL} align="flex-start">
          <GridCol span={{ base: 12, md: 5 }}>
            <Title ta={{ base: "center", md: "left" }} order={1}>
              {t("signIn.title")}
            </Title>
            <Text
              c="dimmed"
              size="sm"
              ta={{ base: "center", md: "left" }}
              mt={SizeEnum.XS}
            >
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
            <Text
              c="dimmed"
              size="sm"
              ta={{ base: "center", md: "left" }}
            >
              <Anchor
                size="sm"
                component="button"
                type="button"
                onClick={() => navigate(RouteEnum.FORGOT_PASSWORD)}
              >
                {t("signIn.forgotPasswordLink")}
              </Anchor>
            </Text>
          </GridCol>
          <GridCol span={{ base: 12, md: 7 }}>
            <Paper withBorder shadow="md" p={SizeEnum.LG} radius="md">
              <form onSubmit={formik.handleSubmit}>
                <Stack>
                  <TextInput
                    label={t("signIn.fields.identifier.label")}
                    placeholder={t("signIn.fields.identifier.placeholder")}
                    name="identifier"
                    value={formik.values.identifier}
                    onChange={formik.handleChange}
                    onBlur={handleBlur("identifier")}
                    error={
                      formik.touched.identifier &&
                      formik.errors.identifier &&
                      t(formik.errors.identifier)
                    }
                  />
                  <PasswordInput
                    label={t("signIn.fields.password.label")}
                    placeholder={t("signIn.fields.password.placeholder")}
                    name="password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={handleBlur("password")}
                    error={
                      formik.touched.password &&
                      formik.errors.password &&
                      t(formik.errors.password)
                    }
                  />
                  {submitError && (
                    <Text c="red" size="sm" ta="center">
                      {submitError}
                    </Text>
                  )}
                  <Button
                    type="submit"
                    fullWidth
                    mt="xl"
                    loading={isSubmitting}
                  >
                    {t("signIn.submitButton")}
                  </Button>
                </Stack>
              </form>
            </Paper>
          </GridCol>
        </Grid>
      </Stack>
    </Container>
  );
};
