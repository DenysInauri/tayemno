import { Group } from "../../ui/Group";
import { Skeleton } from "../../ui/Skeleton";
import classes from "./index.module.css";

export const BreadcrumbSkeleton = () => (
  <Group gap="xs" className={classes.container}>
    <Skeleton height={14} width={50} />
    <Skeleton height={14} width={80} />
    <Skeleton height={14} width={100} />
  </Group>
);
