import { type ChangeEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import { useDebouncedValue } from "@mantine/hooks";
import { Loader } from "@mantine/core";
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
import { SizeEnum } from "../../enums/ui/SizeEnum";
import { useGetIsUsernameFree } from "../../api/hooks/useGetIsUsernameFree";
import { usePostRegister } from "../../api/hooks/usePostRegister";
import { registerSchema } from "../../validations/registerSchema";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

interface IRegisterFormValues {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface IProps {
  onRegistered?: (email: string) => void;
}

export const RegisterPage = ({ onRegistered }: IProps) => {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState("");
  const { mutate: register, isPending } = usePostRegister();

  const formik = useFormik<IRegisterFormValues>({
    initialValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema: registerSchema,
    validateOnChange: true,
    validateOnBlur: false,
    onSubmit: (values) => {
      setSubmitError("");
      register(
        {
          name: values.name,
          username: values.username,
          email: values.email,
          srpSalt: "placeholder",
          srpVerifier: "placeholder",
          kdfSalt: "placeholder",
          kdfAlgorithm: "argon2id",
          kdfMemoryKib: 65536,
          kdfIterations: 3,
          kdfParallelism: 4,
          publicKey: "placeholder",
          encryptedPrivateKey: "placeholder",
          privateKeyNonce: "placeholder",
        },
        {
          onSuccess: (data) => {
            onRegistered?.(data.email);
          },
          onError: (err) => {
            setSubmitError(getApiErrorMessage(err, t));
          },
        },
      );
    },
  });

  const [debouncedUsername] = useDebouncedValue(formik.values.username, 250);

  const hasUsernameValidationError = Boolean(
    formik.touched.username && formik.errors.username,
  );

  const { data: usernameCheck, isLoading: isCheckingUsername } =
    useGetIsUsernameFree(hasUsernameValidationError ? "" : debouncedUsername);

  const isUsernameTaken = !!usernameCheck && !usernameCheck.isFree;

  const isUsernameAvailable =
    !!usernameCheck &&
    usernameCheck.isFree &&
    !hasUsernameValidationError &&
    formik.values.username.length > 0;

  const usernameError = useMemo(() => {
    if (hasUsernameValidationError) return t(formik.errors.username!);
    if (isUsernameTaken) return t("register.validation.usernameTaken");
  }, [hasUsernameValidationError, formik.errors.username, t, isUsernameTaken]);

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    formik.setFieldValue("username", e.target.value.toLowerCase());
  };

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
              <Anchor size="sm" component="button" type="button">
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
                    label={t("register.fields.username.label")}
                    placeholder={t("register.fields.username.placeholder")}
                    name="username"
                    value={formik.values.username}
                    onChange={handleUsernameChange}
                    onBlur={handleBlur("username")}
                    maxLength={255}
                    error={usernameError}
                    successHighlight={isUsernameAvailable}
                    rightSection={
                      isCheckingUsername ? <Loader size={16} /> : undefined
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
