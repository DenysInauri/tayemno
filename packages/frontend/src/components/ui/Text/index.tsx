import { ReactNode } from "react";
import { Text as MantineText, TextProps } from "@mantine/core";

interface IProps extends TextProps {
  children?: ReactNode;
}

export const Text = (props: IProps) => <MantineText {...props} />;
