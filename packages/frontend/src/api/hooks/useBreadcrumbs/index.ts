import { useFolders } from "../useFolders";
export type { IBreadcrumb } from "../useFolders";

export const useBreadcrumbs = (folderId: string | null) => {
  const { breadcrumbs, isLoading } = useFolders(folderId);
  return { data: breadcrumbs, isLoading };
};
