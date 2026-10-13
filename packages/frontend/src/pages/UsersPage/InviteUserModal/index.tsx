import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormik } from "formik";
import type { InvitableRole } from "@tayemno/shared";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Stack } from "../../../components/ui/Stack";
import { Text } from "../../../components/ui/Text";
import { TextInput } from "../../../components/ui/TextInput";
import { useAuth } from "../../../contexts/AuthContext";
import { usePostInviteMember } from "../../../api/hooks/usePostInviteMember";
import { inviteUserSchema } from "../../../validations/inviteUserSchema";
import { generateTempPassword } from "../../../utils/generateTempPassword";
import { buildInvitePayload } from "./buildInvitePayload";
import { RolePicker } from "./RolePicker";

interface IInviteUserModalProps {
  opened: boolean;
  onClose: () => void;
  workspaceName: string;
}

export const InviteUserModal = ({
  opened,
  onClose,
  workspaceName,
}: IInviteUserModalProps) => {
  const { t } = useTranslation();
  const { keyPair, workspace } = useAuth();
  const { mutateAsync } = usePostInviteMember();
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formik = useFormik({
    initialValues: { email: "", name: "", role: "member" },
    validationSchema: inviteUserSchema,
    validateOnChange: true,
    validateOnBlur: false,
    onSubmit: async (values) => {
      setSubmitError("");
      setIsSubmitting(true);

      try {
        const payload = await buildInvitePayload({
          email: values.email,
          name: values.name,
          role: values.role as InvitableRole,
          tempPassword: generateTempPassword(),
          workspaceName,
          adminKeyPair: keyPair!,
          workspace: workspace!,
        });

        await mutateAsync(payload);
        handleClose();
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || "";
        if (msg.includes("already exists")) {
          setSubmitError(t("users.invite.errors.userExists"));
        } else {
          setSubmitError(msg || t("errors.genericError"));
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleClose = () => {
    formik.resetForm();
    setSubmitError("");
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("users.invite.title")}
    >
      <form onSubmit={formik.handleSubmit}>
        <Stack>
          <TextInput
            label={t("users.invite.fields.email.label")}
            placeholder={t("users.invite.fields.email.placeholder")}
            name="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            error={
              formik.touched.email &&
              formik.errors.email &&
              t(formik.errors.email)
            }
          />
          <TextInput
            label={t("users.invite.fields.name.label")}
            placeholder={t("users.invite.fields.name.placeholder")}
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            error={
              formik.touched.name && formik.errors.name && t(formik.errors.name)
            }
          />
          <RolePicker
            value={formik.values.role}
            onChange={(val) => formik.setFieldValue("role", val)}
          />
          {submitError && (
            <Text c="red" size="sm" ta="center">
              {submitError}
            </Text>
          )}
          <Button type="submit" fullWidth loading={isSubmitting}>
            {t("users.invite.submit")}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
};
