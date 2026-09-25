import { useState, ChangeEvent } from "react";
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
import { PasswordStrengthInput } from "../../components/ui/PasswordStrengthInput";
import { Stack } from "../../components/ui/Stack";
import { Text } from "../../components/ui/Text";
import { TextInput } from "../../components/ui/TextInput";
import { Title } from "../../components/ui/Title";
import { RouteEnum } from "../../enums/routing/RouteEnum";
import { SizeEnum } from "../../enums/ui/SizeEnum";
import { usePostRegister } from "../../api/hooks/usePostRegister";
import { registerSchema } from "../../validations/registerSchema";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import {
  generateSalt,
  deriveKey,
  KDF_ITERATIONS,
  KDF_MEMORY_BYTES,
  KDF_PARALLELISM,
} from "../../utils/crypto/deriveKey";
import { AsymmetricCrypto } from "../../utils/crypto/AsymmetricCrypto";
import { SymmetricCrypto } from "../../utils/crypto/SymmetricCrypto";

interface IRegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  workspaceName: string;
}

export const RegisterPage = () => {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState("");
  const { mutate: register, isPending } = usePostRegister();
  const navigate = useNavigate();

  const formik = useFormik<IRegisterFormValues>({
    initialValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      workspaceName: "",
    },
    validationSchema: registerSchema,
    validateOnChange: true,
    validateOnBlur: false,
    onSubmit: async (values) => {
      setSubmitError("");

      const srpSalt = srp.generateSalt();
      const srpPrivateKey = srp.derivePrivateKey(
        srpSalt,
        values.email.toLowerCase(),
        values.password,
      );
      const srpVerifier = srp.deriveVerifier(srpPrivateKey);

      const deriveKeySalt = await generateSalt();
      const userDeriveKey = await deriveKey({
        password: values.password,
        saltHex: deriveKeySalt,
        iterations: KDF_ITERATIONS,
        memoryLimit: KDF_MEMORY_BYTES,
      });

      const userKeyPair = await AsymmetricCrypto.generateKeyPair();
      const encryptedPrivateKey = await SymmetricCrypto.encrypt(
        userKeyPair.privateKey,
        userDeriveKey,
      );

      const workspaceAdminKeyPair = await AsymmetricCrypto.generateKeyPair();
      const encryptedWorkspaceAdminPrivateKey = await AsymmetricCrypto.encrypt(
        workspaceAdminKeyPair.privateKey,
        userKeyPair.publicKey,
      );

      const workspaceMemberKeyPair = await AsymmetricCrypto.generateKeyPair();
      const encryptedWorkspaceMemberPrivateKey = await AsymmetricCrypto.encrypt(
        workspaceMemberKeyPair.privateKey,
        userKeyPair.publicKey,
      );

      register(
        {
          name: values.name,
          email: values.email,
          srpSalt,
          srpVerifier,
          kdfSalt: deriveKeySalt,
          kdfAlgorithm: "argon2id",
          kdfMemoryKib: KDF_MEMORY_BYTES / 1024,
          kdfIterations: KDF_ITERATIONS,
          kdfParallelism: KDF_PARALLELISM,
          publicKey: userKeyPair.publicKey,
          encryptedPrivateKey: encryptedPrivateKey.ciphertext,
          privateKeyNonce: encryptedPrivateKey.nonce,
          workspaceName: values.workspaceName,
          workspaceAdminPublicKey: workspaceAdminKeyPair.publicKey,
          workspaceMemberPublicKey: workspaceMemberKeyPair.publicKey,
          encryptedWorkspaceAdminPrivateKey,
          encryptedWorkspaceMemberPrivateKey,
        },
        {
          onSuccess: (data) => {
            navigate(RouteEnum.VERIFY_EMAIL, {
              state: {
                email: data.email,
                privateKey: userKeyPair.privateKey,
                publicKey: userKeyPair.publicKey,
              },
            });
          },
          onError: (err) => {
            setSubmitError(getApiErrorMessage(err, t));
          },
        },
      );
    },
  });

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    formik.setFieldValue("password", e.target.value.replace(/\s/g, ""));
  };

  const handleBlur = (fieldName: string) => () => {
    formik.setFieldTouched(fieldName, true);
  };

  return (
    <Container size={900} px={SizeEnum.LG}>
      <Stack justify="center" mih="100vh" py={SizeEnum.XL}>
        <Grid gutter={SizeEnum.XL} align="flex-start">
          <GridCol span={{ base: 12, md: 5 }}>
            <Title ta={{ base: "center", md: "left" }} order={1}>
              {t("register.title")}
            </Title>
            <Text
              c="dimmed"
              size="sm"
              ta={{ base: "center", md: "left" }}
              mt={SizeEnum.XS}
            >
              {t("register.subtitle")}{" "}
              <Anchor
                size="sm"
                component="button"
                type="button"
                onClick={() => navigate(RouteEnum.SIGN_IN)}
              >
                {t("register.signInLink")}
              </Anchor>
            </Text>
          </GridCol>
          <GridCol span={{ base: 12, md: 7 }}>
            <Paper withBorder shadow="md" p={SizeEnum.LG} radius="md">
              <form onSubmit={formik.handleSubmit}>
                <Stack>
                  <TextInput
                    label={t("register.fields.name.label")}
                    placeholder={t("register.fields.name.placeholder")}
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={handleBlur("name")}
                    error={
                      formik.touched.name &&
                      formik.errors.name &&
                      t(formik.errors.name)
                    }
                  />
                  <TextInput
                    label={t("register.fields.email.label")}
                    placeholder={t("register.fields.email.placeholder")}
                    name="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={handleBlur("email")}
                    error={
                      formik.touched.email &&
                      formik.errors.email &&
                      t(formik.errors.email)
                    }
                  />
                  <TextInput
                    label={t("register.fields.workspaceName.label")}
                    placeholder={t("register.fields.workspaceName.placeholder")}
                    name="workspaceName"
                    value={formik.values.workspaceName}
                    onChange={formik.handleChange}
                    onBlur={handleBlur("workspaceName")}
                    error={
                      formik.touched.workspaceName &&
                      formik.errors.workspaceName &&
                      t(formik.errors.workspaceName)
                    }
                  />
                  <PasswordStrengthInput
                    label={t("register.fields.password.label")}
                    placeholder={t("register.fields.password.placeholder")}
                    name="password"
                    value={formik.values.password}
                    onChange={handlePasswordChange}
                    onBlur={handleBlur("password")}
                    touched={!!formik.touched.password}
                  />
                  <PasswordInput
                    label={t("register.fields.confirmPassword.label")}
                    placeholder={t(
                      "register.fields.confirmPassword.placeholder",
                    )}
                    name="confirmPassword"
                    value={formik.values.confirmPassword}
                    onChange={formik.handleChange}
                    onBlur={handleBlur("confirmPassword")}
                    error={
                      (formik.values.confirmPassword.length > 0 ||
                        formik.touched.confirmPassword) &&
                      formik.errors.confirmPassword &&
                      t(formik.errors.confirmPassword)
                    }
                  />
                  {submitError && (
                    <Text c="red" size="sm" ta="center">
                      {submitError}
                    </Text>
                  )}
                  <Button type="submit" fullWidth mt="xl" loading={isPending}>
                    {t("register.submitButton")}
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
