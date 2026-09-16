import { ReactNode } from "react";
import { Modal as MantineModal, ModalProps } from "@mantine/core";

interface IProps extends ModalProps {
  children?: ReactNode;
}

export const Modal = (props: IProps) => <MantineModal {...props} />;
