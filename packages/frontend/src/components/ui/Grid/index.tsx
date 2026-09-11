import { ReactNode } from "react";
import { Grid as MantineGrid, GridProps } from "@mantine/core";

interface IProps extends GridProps {
  children?: ReactNode;
}

export const Grid = (props: IProps) => <MantineGrid {...props} />;
