import { Group } from "../../ui/Group";
import { Skeleton } from "../../ui/Skeleton";

export const BreadcrumbSkeleton = () => (
  <Group gap="xs" style={{ height: 20 }}>
    <Skeleton height={14} width={50} />
    <Skeleton height={14} width={80} />
    <Skeleton height={14} width={100} />
  </Group>
);
