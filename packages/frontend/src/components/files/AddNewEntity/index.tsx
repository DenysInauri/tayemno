import { useQueryClient } from "@tanstack/react-query";
import { IconRefresh } from "@tabler/icons-react";
import { Group } from "../../ui/Group";
import { ActionIcon } from "../../ui/ActionIcon";
import { useAuth } from "../../../contexts/AuthContext";
import { QueryKeyEnum } from "../../../enums/api/QueryKeyEnum";
import { UploadFileActions } from "./UploadFileActions";
import { UploadFolderAction } from "./UploadFolderAction";
import { CreateFolderAction } from "./CreateFolderAction";
import { RoleWrapper } from "../../routing/RoleWrapper";

interface IProps {
  folderId: string | null;
}

export const AddNewEntity = ({ folderId }: IProps) => {
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

  return (
    <Group gap="xs">
      <RoleWrapper allowedFor={["owner", "admin", "member"]}>
        <UploadFileActions folderId={folderId} />
        <UploadFolderAction folderId={folderId} />
        <CreateFolderAction folderId={folderId} />
      </RoleWrapper>

      {folderId && (
        <RoleWrapper allowedFor={["external_member"]}>
          <UploadFileActions folderId={folderId} />
          <UploadFolderAction folderId={folderId} />
          <CreateFolderAction folderId={folderId} />
        </RoleWrapper>
      )}

      <ActionIcon variant="default" size="input-sm" onClick={handleRefresh}>
        <IconRefresh size={16} />
      </ActionIcon>
    </Group>
  );
};
