import { useState, ChangeEvent } from "react";
import { useFormik } from "formik";
import { useTranslation } from "react-i18next";
import type { ISignInUserData, IKeyPair } from "@tayemno/shared";
import { usePostChangePassword } from "../../api/hooks/usePostChangePassword";
import { changePasswordSchema } from "../../validations/changePasswordSchema";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";
import { buildChangePasswordPayload } from "../../utils/crypto/buildChangePasswordPayload";

interface IParams {
  user: ISignInUserData | null;
  keyPair: IKeyPair | null;
  onSuccess: () => void;
}

export const useChangePasswordForm = ({ user, keyPair, onSuccess }: IParams) => {
  const { t } = useTranslation();
  const { mutateAsync: changePassword } = usePostChangePassword();
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    initialValues: { password: "", confirmPassword: "" },
    validationSchema: changePasswordSchema,
    validateOnChange: true,
    validateOnBlur: false,
    onSubmit: async (values) => {
      if (!user || !keyPair) return;
      setSubmitError("");
      setIsSubmitting(true);

      try {
        const payload = await buildChangePasswordPayload({
          email: user.email,
          newPassword: values.password,
          privateKey: keyPair.privateKey,
        });

        await changePassword(payload);
        onSuccess();
      } catch (err: any) {
        setSubmitError(getApiErrorMessage(err, t));
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    formik.setFieldValue("password", e.target.value.replace(/\s/g, ""));
  };

  const handleBlur = (fieldName: string) => () => {
    formik.setFieldTouched(fieldName, true);
  };

  return { formik, submitError, isSubmitting, handlePasswordChange, handleBlur };
};
