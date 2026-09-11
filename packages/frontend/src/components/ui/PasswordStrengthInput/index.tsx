import { useTranslation } from "react-i18next";
import { Box, Center, Group, PasswordInputProps, Progress } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { PasswordInput } from "../PasswordInput";
import { Text } from "../Text";
import { SizeEnum } from "../../../enums/ui/SizeEnum";

const MIN_PASSWORD_LENGTH = 6;

const PASSWORD_REQUIREMENTS = [
  { re: /[0-9]/, label: "register.validation.passwordIncludesNumber" },
  { re: /[a-z]/, label: "register.validation.passwordIncludesLowercase" },
  { re: /[A-Z]/, label: "register.validation.passwordIncludesUppercase" },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: "register.validation.passwordIncludesSpecial" },
];

interface IProps extends PasswordInputProps {
  touched?: boolean;
}

const getStrength = (password: string) => {
  let multiplier = password.length >= MIN_PASSWORD_LENGTH ? 0 : 1;

  PASSWORD_REQUIREMENTS.forEach((requirement) => {
    if (!requirement.re.test(password)) {
      multiplier += 1;
    }
  });

  return Math.max(100 - (100 / (PASSWORD_REQUIREMENTS.length + 1)) * multiplier, 0);
};

const getRequirementColor = (meets: boolean, touched: boolean) => {
  if (meets) return "teal";
  if (touched) return "red";
  return "dimmed";
};

const PasswordRequirement = ({ meets, label, touched }: { meets: boolean; label: string; touched: boolean }) => (
  <Text component="div" c={getRequirementColor(meets, touched)} mt={SizeEnum.XS} size="sm">
    <Center inline>
      {meets ? <IconCheck size={14} stroke={1.5} /> : <IconX size={14} stroke={1.5} />}
      <Box ml={SizeEnum.XS}>{label}</Box>
    </Center>
  </Text>
);

export const PasswordStrengthInput = ({
  touched = false,
  ...passwordInputProps
}: IProps) => {
  const { t } = useTranslation();
  const value = typeof passwordInputProps.value === "string" ? passwordInputProps.value : "";
  const strength = getStrength(value);

  const checks = PASSWORD_REQUIREMENTS.map((requirement) => (
    <PasswordRequirement
      key={requirement.label}
      label={t(requirement.label)}
      meets={requirement.re.test(value)}
      touched={touched}
    />
  ));

  const bars = Array(4)
    .fill(0)
    .map((_, index) => (
      <Progress
        styles={{ section: { transitionDuration: "0ms" } }}
        value={
          value.length > 0 && index === 0 ? 100 : strength >= ((index + 1) / 4) * 100 ? 100 : 0
        }
        color={strength > 80 ? "teal" : strength > 50 ? "yellow" : "red"}
        key={index}
        size={4}
      />
    ));

  return (
    <div>
      <PasswordInput {...passwordInputProps} />
      <Group gap={SizeEnum.XS} grow mt="xs" mb="md">
        {bars}
      </Group>
      <PasswordRequirement
        label={t("register.validation.passwordMinLength")}
        meets={value.length >= MIN_PASSWORD_LENGTH}
        touched={touched}
      />
      {checks}
    </div>
  );
};
