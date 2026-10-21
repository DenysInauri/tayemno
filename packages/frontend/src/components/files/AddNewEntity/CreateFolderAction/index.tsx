import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { AuditActionEnum } from "@tayemno/shared";
import { Button } from "../../../ui/Button";
import { CreateFolderModal } from "../../CreateFolderModal";
import { usePostCreateFolder } from "../../../../api/hooks/usePostCreateFolder";
import { useAuth } from "../../../../contexts/AuthContext";
import { useGetFolderKeyAsMember } from "../../../../api/hooks/useGetFolderKeyAsMember";
import { QueryKeyEnum } from "../../../../enums/api/QueryKeyEnum";
import { usePostAuditLog } from "../../../../api/hooks/usePostAuditLog";
import { buildCreateFolderPayload } from "../buildCreateFolderPayload";

interface IProps {
  folderId: string | null;
}

export const CreateFolderAction = ({ folderId }: IProps) => {
  const { t } = useTranslation();
  const { workspace, user, keyPair } = useAuth();
  const queryClient = useQueryClient();
  const createFolder = usePostCreateFolder();
  const { getFolderKey } = useGetFolderKeyAsMember();
  const { logAction } = usePostAuditLog();
  const [opened, { open, close }] = useDisclosure();

  const handleCreateFolder = async (name: string) => {
    if (!workspace || !user || !keyPair) return;

    const payload = await buildCreateFolderPayload({
      name,
      folderId,
      adminPublicKey: workspace.adminPublicKey,
      userPublicKey: user.publicKey,
      getFolderKey,
    });

    await createFolder.mutateAsync(payload);

    logAction({ action: AuditActionEnum.FOLDER_CREATED, folderId: folderId ?? null, folderName: name });

    queryClient.invalidateQueries({
      queryKey: [QueryKeyEnum.FOLDERS, workspace.id, folderId],
    });
  };

  return (
    <>
      <Button leftSection={<IconPlus size={16} />} onClick={open}>
        {t("files.addFolderButton")}
      </Button>
      <CreateFolderModal
        opened={opened}
        onClose={close}
        onSubmit={handleCreateFolder}
      />
    </>
  );
};
