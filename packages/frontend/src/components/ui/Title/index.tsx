import { ReactNode } from "react";
import { Title as MantineTitle, TitleProps } from "@mantine/core";

interface IProps extends TitleProps {
  children?: ReactNode;
}

export const Title = (props: IProps) => <MantineTitle {...props} />;
