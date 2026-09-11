import { ReactNode } from "react";
import { GridColProps, Grid as MantineGrid } from "@mantine/core";

interface IProps extends GridColProps {
  children?: ReactNode;
}

export const GridCol = (props: IProps) => <MantineGrid.Col {...props} />;
