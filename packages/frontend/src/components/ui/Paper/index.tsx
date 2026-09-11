import { ReactNode } from "react";
import { Paper as MantinePaper, PaperProps } from "@mantine/core";

interface IProps extends PaperProps {
  children?: ReactNode;
}

export const Paper = (props: IProps) => <MantinePaper {...props} />;
