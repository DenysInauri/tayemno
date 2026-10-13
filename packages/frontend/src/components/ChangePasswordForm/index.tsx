import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { PasswordInput } from "../ui/PasswordInput";
import { Stack } from "../ui/Stack";
import { Text } from "../ui/Text";
import { useAuth } from "../../contexts/AuthContext";
import { useChangePasswordForm } from "../../hooks/useChangePasswordForm";

interface IChangePasswordFormProps {
  onSuccess: () => void;
}

export const ChangePasswordForm = ({ onSuccess }: IChangePasswordFormProps) => {
  const { t } = useTranslation();
  const { user, keyPair } = useAuth();
  const { formik, submitError, isSubmitting, handlePasswordChange, handleBlur } =
    useChangePasswordForm({ user, keyPair, onSuccess });

  return (
    <form onSubmit={formik.handleSubmit}>
      <Stack>
        <PasswordInput
          label={t("changePassword.fields.password.label")}
          placeholder={t("changePassword.fields.password.placeholder")}
          name="password"
          value={formik.values.password}
          onChange={handlePasswordChange}
          onBlur={handleBlur("password")}
          error={
            formik.touched.password &&
            formik.errors.password &&
            t(formik.errors.password)
          }
        />
        <PasswordInput
          label={t("changePassword.fields.confirmPassword.label")}
          placeholder={t(
            "changePassword.fields.confirmPassword.placeholder",
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
        <Button type="submit" fullWidth mt="xl" loading={isSubmitting}>
          {t("changePassword.submitButton")}
        </Button>
      </Stack>
    </form>
  );
};
