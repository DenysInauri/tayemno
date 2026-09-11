import { TextInput as MantineTextInput, TextInputProps } from "@mantine/core";

interface IProps extends TextInputProps {}

export const TextInput = (props: IProps) => <MantineTextInput {...props} />;
