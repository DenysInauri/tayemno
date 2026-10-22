import { useMemo } from "react";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import type { IGetAuditLogsResponse } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { decryptEntries, type IDecryptedAuditLog } from "./decryptEntries";

export type { IDecryptedAuditLog } from "./decryptEntries";

interface IParams {
  folderId?: string | null;
  vaultId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  actionType?: string | null;
  userId?: string | null;
}

interface IDecryptedPage {
  logs: IDecryptedAuditLog[];
  nextCursor: string | null;
}

export const useGetAuditLogs = ({
  folderId,
  vaultId,
  dateFrom,
  dateTo,
  actionType,
  userId,
}: IParams) => {
  const { workspace, keyPair } = useAuth();

  const query = useInfiniteQuery<
    IDecryptedPage,
    Error,
    InfiniteData<IDecryptedPage>,
    unknown[],
    string | undefined
  >({
    queryKey: [
      QueryKeyEnum.AUDIT_LOGS,
      workspace?.id,
      folderId,
      vaultId,
      dateFrom,
      dateTo,
      actionType,
      userId,
    ],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (vaultId) params.set("vaultId", vaultId);
      else if (folderId) params.set("folderId", folderId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (actionType) params.set("actionType", actionType);
      if (userId) params.set("userId", userId);
      if (pageParam) params.set("cursor", pageParam);
      params.set("limit", "50");

      const { data } = await axios.get<IGetAuditLogsResponse>(
        `${EndpointEnum.WORKSPACES}/${workspace?.id}${EndpointEnum.AUDIT_LOGS}?${params}`,
      );

      const logs = await decryptEntries({
        entries: data.logs,
        adminPublicKey: workspace!.adminPublicKey,
        encryptedAdminPrivateKey: workspace!.encryptedAdminPrivateKey!,
        userPublicKey: keyPair!.publicKey,
        userPrivateKey: keyPair!.privateKey,
      });

      return { logs, nextCursor: data.nextCursor };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!workspace?.encryptedAdminPrivateKey && !!keyPair,
    initialPageParam: undefined,
  });

  const logs = useMemo(
    () => query.data?.pages.flatMap((p) => p.logs) ?? [],
    [query.data],
  );

  return {
    logs,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
};
