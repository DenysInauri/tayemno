import {
  Progress as MantineProgress,
  ProgressProps,
} from "@mantine/core";

interface IProps extends ProgressProps {}

export const Progress = (props: IProps) => <MantineProgress {...props} />;
