import { useQuery } from "@tanstack/react-query";
import type { IGetFoldersByParentResponse } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { useDecryptFolder } from "../useDecryptFolder";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import type { ILocalFolder } from "../../../types/local";

const collator = new Intl.Collator(undefined, { numeric: true });

export const useFolders = (parentFolderId: string | null) => {
  const { workspace } = useAuth();
  const { decrypt } = useDecryptFolder();

  const query = useQuery<ILocalFolder[]>({
    queryKey: [QueryKeyEnum.FOLDERS, workspace?.id, parentFolderId],
    queryFn: async () => {
      const params = parentFolderId
        ? `?parentFolderId=${parentFolderId}`
        : "";

      const { data } = await axios.get<IGetFoldersByParentResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace!.id}${EndpointEnum.FOLDERS}${params}`,
      );

      const decrypted = await Promise.all(data.folders.map(decrypt));
      return decrypted.sort((a, b) => collator.compare(a.name, b.name));
    },
    enabled: !!workspace,
  });

  return { data: query.data ?? [], isLoading: query.isLoading, isFetching: query.isFetching };
};
