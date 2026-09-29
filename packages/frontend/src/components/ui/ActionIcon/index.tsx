import type { ReactNode } from "react";
import { ActionIcon as MantineActionIcon, type ActionIconProps } from "@mantine/core";

interface IProps extends ActionIconProps {
  children?: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ActionIcon = (props: IProps) => <MantineActionIcon {...props} />;
