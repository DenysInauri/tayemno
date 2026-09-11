import { ReactNode } from "react";
import { Stack as MantineStack, StackProps } from "@mantine/core";

interface IProps extends StackProps {
  children?: ReactNode;
}

export const Stack = (props: IProps) => <MantineStack {...props} />;
