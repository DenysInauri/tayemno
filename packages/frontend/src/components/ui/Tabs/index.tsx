import { ReactNode } from "react";
import { Tabs as MantineTabs, TabsProps } from "@mantine/core";

interface IProps extends TabsProps {
  children?: ReactNode;
}

export const Tabs = (props: IProps) => <MantineTabs {...props} />;

export const TabsList = MantineTabs.List;
export const TabsTab = MantineTabs.Tab;
export const TabsPanel = MantineTabs.Panel;
