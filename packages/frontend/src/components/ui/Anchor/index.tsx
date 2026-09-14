import { ElementType, ReactNode } from "react";
import { Anchor as MantineAnchor, AnchorProps } from "@mantine/core";

interface IProps extends AnchorProps {
  children?: ReactNode;
  component?: ElementType;
  type?: string;
  onClick?: () => void;
}

export const Anchor = (props: IProps) => (
  <MantineAnchor {...(props as AnchorProps)} />
);
