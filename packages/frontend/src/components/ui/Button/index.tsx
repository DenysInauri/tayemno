import { ReactNode } from "react";
import { Button as MantineButton, ButtonProps } from "@mantine/core";

interface IProps extends ButtonProps {
  children?: ReactNode;
  type?: "submit" | "button" | "reset";
}

export const Button = (props: IProps) => <MantineButton {...props} />;
