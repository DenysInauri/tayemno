import { Group } from "../../ui/Group";
import { Skeleton } from "../../ui/Skeleton";

export const BreadcrumbSkeleton = () => (
  <Group gap="xs">
    <Skeleton height={20} width={50} />
    <Skeleton height={20} width={80} />
    <Skeleton height={20} width={100} />
  </Group>
);
