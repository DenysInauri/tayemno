import type { IGetAllVaultsResponse, Vault } from "@tayemno/shared";
import type { Database } from "../../../db";
import * as vaultsRepo from "../../../repositories/vaults";
import * as workspaceMembersRepo from "../../../repositories/workspaceMembers";
import { HttpError } from "../../../utils/httpError";
import { mapTimestamps } from "../../../utils/mapTimestamps";

export const getAllVaults = async (
  db: Database,
  userId: string,
  workspaceId: string,
): Promise<IGetAllVaultsResponse> => {
  const membership = await workspaceMembersRepo.findByWorkspaceIdAndUserId(db, workspaceId, userId);
  if (!membership) throw new HttpError(403, "Access denied");

  const rows = await vaultsRepo.findAllByWorkspaceAndUser(db, workspaceId, userId);
  return { vaults: (rows as any[]).map(mapTimestamps) as Vault[] };
};
