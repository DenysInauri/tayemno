import { ElementType, ReactNode } from "react";
import { Text as MantineText, TextProps } from "@mantine/core";

interface IProps extends TextProps {
  children?: ReactNode;
  component?: ElementType;
}

export const Text = (props: IProps) => (
  <MantineText {...(props as TextProps)} />
);
