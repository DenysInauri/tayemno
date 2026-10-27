import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { IGetFoldersByParentResponse, IFolderPermissions } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { useDecryptFolderAsMember } from "../useDecryptFolderAsMember";
import { resolvePermissions } from "../resolvePermissions";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import type { ILocalFolder } from "../../../types/local";

interface IUseListOptions {
  searchQuery?: string;
}

interface IFolderQueryData {
  folders: ILocalFolder[];
  permissions: IFolderPermissions;
}

const collator = new Intl.Collator(undefined, { numeric: true });

export const useFolders = (
  parentFolderId: string | null,
  options?: IUseListOptions,
) => {
  const { workspace } = useAuth();
  const { decrypt } = useDecryptFolderAsMember();

  const query = useQuery<IFolderQueryData>({
    queryKey: [QueryKeyEnum.FOLDERS, workspace?.id, parentFolderId],
    queryFn: async () => {
      const params = parentFolderId ? `?parentFolderId=${parentFolderId}` : "";

      const { data } = await axios.get<IGetFoldersByParentResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.FOLDERS}${params}`,
      );

      const decrypted = await Promise.all(data.folders.map(decrypt));
      return {
        folders: decrypted.sort((a, b) => collator.compare(a.name, b.name)),
        permissions: resolvePermissions(workspace!.role, data.permissions),
      };
    },
    enabled: !!workspace,
  });

  const all = query.data?.folders ?? [];

  const data = useMemo(() => {
    if (!options?.searchQuery || !options.searchQuery.length) return all;
    return all.filter((f) =>
      f.name.toLowerCase().includes(options.searchQuery!.toLowerCase()),
    );
  }, [all, options?.searchQuery]);

  return {
    data,
    permissions: resolvePermissions(workspace?.role, query.data?.permissions),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
};
