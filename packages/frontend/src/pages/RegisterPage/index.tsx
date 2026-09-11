import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { useFormik } from "formik";
import * as yup from "yup";
import { Anchor } from "../../components/ui/Anchor";
import { Button } from "../../components/ui/Button";
import { Container } from "../../components/ui/Container";
import { Paper } from "../../components/ui/Paper";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Stack } from "../../components/ui/Stack";
import { Text } from "../../components/ui/Text";
import { TextInput } from "../../components/ui/TextInput";
import { Title } from "../../components/ui/Title";
import { SizeEnum } from "../../enums/ui/SizeEnum";

interface IRegisterFormValues {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const createRegisterSchema = (t: TFunction) =>
  yup.object().shape({
    name: yup.string().trim().required(t("register.validation.nameRequired")),
    username: yup
      .string()
      .trim()
      .required(t("register.validation.usernameRequired"))
      .min(3, t("register.validation.usernameMinLength")),
    email: yup
      .string()
      .trim()
      .required(t("register.validation.emailRequired"))
      .email(t("register.validation.emailInvalid")),
    password: yup
      .string()
      .required(t("register.validation.passwordRequired"))
      .min(8, t("register.validation.passwordMinLength")),
    confirmPassword: yup
      .string()
      .required(t("register.validation.confirmPasswordRequired"))
      .oneOf(
        [yup.ref("password")],
        t("register.validation.confirmPasswordMismatch"),
      ),
  });

export const RegisterPage = () => {
  const { t } = useTranslation();

  const formik = useFormik<IRegisterFormValues>({
    initialValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationSchema: createRegisterSchema(t),
    validateOnChange: true,
    validateOnBlur: false,
    onSubmit: (values) => {
      console.log("Registration form submitted:", {
        name: values.name,
        username: values.username,
        email: values.email,
      });
    },
  });

  return (
    <Container size={420} py={SizeEnum.XL}>
      <Title ta="center" order={1}>
        {t("register.title")}
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={SizeEnum.XS}>
        {t("register.subtitle")}{" "}
        <Anchor size="sm" component="button" type="button">
          {t("register.signInLink")}
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={SizeEnum.LG} mt={SizeEnum.LG} radius="md">
        <form onSubmit={formik.handleSubmit}>
          <Stack>
            <TextInput
              label={t("register.fields.name.label")}
              placeholder={t("register.fields.name.placeholder")}
              name="name"
              value={formik.values.name}
              onChange={formik.handleChange}
              error={formik.touched.name && formik.errors.name}
            />
            <TextInput
              label={t("register.fields.username.label")}
              placeholder={t("register.fields.username.placeholder")}
              name="username"
              value={formik.values.username}
              onChange={formik.handleChange}
              error={formik.touched.username && formik.errors.username}
            />
            <TextInput
              label={t("register.fields.email.label")}
              placeholder={t("register.fields.email.placeholder")}
              name="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              error={formik.touched.email && formik.errors.email}
            />
            <PasswordInput
              label={t("register.fields.password.label")}
              placeholder={t("register.fields.password.placeholder")}
              name="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              error={formik.touched.password && formik.errors.password}
            />
            <PasswordInput
              label={t("register.fields.confirmPassword.label")}
              placeholder={t("register.fields.confirmPassword.placeholder")}
              name="confirmPassword"
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              error={
                formik.touched.confirmPassword && formik.errors.confirmPassword
              }
            />
            <Button type="submit" fullWidth mt="xl">
              {t("register.submitButton")}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};
