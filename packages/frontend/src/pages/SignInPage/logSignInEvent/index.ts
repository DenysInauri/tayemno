import { AuditActionEnum, type IAuditLogPayload } from "@tayemno/shared";
import { axios } from "../../../api/axios";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";
import { encryptAuditLog } from "../../../utils/crypto/encryptAuditLog";

interface IParams {
  workspaceId: string;
  adminPublicKey: string;
  actorName: string;
  actorEmail: string;
}

export const logSignInEvent = async ({
  workspaceId,
  adminPublicKey,
  actorName,
  actorEmail,
}: IParams) => {
  try {
    const payload: IAuditLogPayload = {
      action: AuditActionEnum.AUTH_SIGN_IN,
      actorName,
      actorEmail,
    };
    const encrypted = await encryptAuditLog(payload, adminPublicKey);
    await axios.post(
      `${EndpointEnum.WORKSPACES}/${workspaceId}${EndpointEnum.AUDIT_LOGS}`,
      { folderId: null, vaultId: null, actionType: AuditActionEnum.AUTH_SIGN_IN, ...encrypted },
    );
  } catch {
    // Silent fail — audit logs must not block sign-in
  }
};
