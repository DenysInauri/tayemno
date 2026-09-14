import { PinInput as MantinePinInput, PinInputProps } from "@mantine/core";

interface IProps extends PinInputProps {}

export const PinInput = (props: IProps) => <MantinePinInput {...props} />;
