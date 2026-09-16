import { ReactNode } from "react";
import { Group as MantineGroup, GroupProps } from "@mantine/core";

interface IProps extends GroupProps {
  children?: ReactNode;
}

export const Group = (props: IProps) => <MantineGroup {...props} />;
