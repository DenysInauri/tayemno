import {
  CopyButton as MantineCopyButton,
  CopyButtonProps,
} from "@mantine/core";

interface IProps extends CopyButtonProps {}

export const CopyButton = (props: IProps) => <MantineCopyButton {...props} />;
