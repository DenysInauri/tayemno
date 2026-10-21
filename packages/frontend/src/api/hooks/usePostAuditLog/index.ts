import { useCallback } from "react";
import type { IAuditLogPayload } from "@tayemno/shared";
import { axios } from "../../axios";
import { useAuth } from "../../../contexts/AuthContext";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { encryptAuditLog } from "../../../utils/crypto/encryptAuditLog";
import { buildPayload, type LogActionParams } from "./buildPayload";

export type { LogActionParams } from "./buildPayload";

export const usePostAuditLog = () => {
  const { workspace, user } = useAuth();

  const logAction = useCallback(
    (params: LogActionParams) => {
      if (!workspace || !user) return;
      const { folderId, vaultId, context } = buildPayload(params);
      const payload: IAuditLogPayload = {
        action: params.action,
        actorName: user.name,
        actorEmail: user.email,
        context,
      };
      encryptAuditLog(payload, workspace.adminPublicKey)
        .then((encrypted) =>
          axios.post(
            `${EndpointEnum.WORKSPACES}/${workspace.id}${EndpointEnum.AUDIT_LOGS}`,
            { folderId, vaultId, ...encrypted },
          ),
        )
        .catch(() => {
          // Silently ignore — audit logs must not block user operations
        });
    },
    [workspace, user],
  );

  return { logAction };
};
