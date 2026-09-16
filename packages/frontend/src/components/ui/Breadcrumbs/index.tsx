import { ReactNode } from "react";
import {
  Breadcrumbs as MantineBreadcrumbs,
  BreadcrumbsProps,
} from "@mantine/core";

interface IProps extends BreadcrumbsProps {
  children: ReactNode;
}

export const Breadcrumbs = (props: IProps) => (
  <MantineBreadcrumbs {...props} />
);
