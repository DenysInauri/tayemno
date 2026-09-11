import { ElementType, ReactNode } from "react";
import { Anchor as MantineAnchor, AnchorProps } from "@mantine/core";

interface IProps extends AnchorProps {
  children?: ReactNode;
  component?: ElementType;
  type?: string;
}

export const Anchor = (props: IProps) => (
  <MantineAnchor {...(props as AnchorProps)} />
);
