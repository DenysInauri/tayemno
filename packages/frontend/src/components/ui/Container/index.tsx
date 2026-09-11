import { ReactNode } from "react";
import { Container as MantineContainer, ContainerProps } from "@mantine/core";

interface IProps extends ContainerProps {
  children?: ReactNode;
}

export const Container = (props: IProps) => <MantineContainer {...props} />;
