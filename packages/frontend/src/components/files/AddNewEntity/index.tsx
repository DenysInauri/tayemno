import { useQueryClient } from "@tanstack/react-query";
import { IconRefresh } from "@tabler/icons-react";
import type { IFolderPermissions } from "@tayemno/shared";
import { Group } from "../../ui/Group";
import { ActionIcon } from "../../ui/ActionIcon";
import { useAuth } from "../../../contexts/AuthContext";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { UploadFileActions } from "./UploadFileActions";
import { UploadFolderAction } from "./UploadFolderAction";
import { CreateFolderAction } from "./CreateFolderAction";

interface IProps {
  folderId: string | null;
  permissions: IFolderPermissions;
}

export const AddNewEntity = ({ folderId, permissions }: IProps) => {
  const { workspace } = useAuth();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: [QueryKeyEnum.FOLDERS, workspace?.id, folderId],
    });
    queryClient.invalidateQueries({
      queryKey: [QueryKeyEnum.VAULTS, workspace?.id, folderId],
    });
  };

  const canAdd = permissions.canAdd;

  return (
    <Group gap="xs">
      {canAdd && (
        <>
          <UploadFileActions folderId={folderId} />
          <UploadFolderAction folderId={folderId} />
          <CreateFolderAction folderId={folderId} />
        </>
      )}

      <ActionIcon variant="default" size="input-sm" onClick={handleRefresh}>
        <IconRefresh size={16} />
      </ActionIcon>
    </Group>
  );
};
