import { PasswordInput as MantinePasswordInput, PasswordInputProps } from "@mantine/core";

interface IProps extends PasswordInputProps {}

export const PasswordInput = (props: IProps) => <MantinePasswordInput {...props} />;
