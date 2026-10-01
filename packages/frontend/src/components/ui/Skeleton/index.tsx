import {
  Skeleton as MantineSkeleton,
  SkeletonProps,
} from "@mantine/core";

interface IProps extends SkeletonProps {}

export const Skeleton = (props: IProps) => <MantineSkeleton {...props} />;
