import { ReactNode } from "react";
import { Drawer as MantineDrawer, DrawerProps } from "@mantine/core";

interface IProps extends DrawerProps {
  children?: ReactNode;
}

export const Drawer = (props: IProps) => <MantineDrawer {...props} />;
