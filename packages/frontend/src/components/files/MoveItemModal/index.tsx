import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Tree, useTree } from "@mantine/core";
import type { ILocalFolder } from "../../../types/local";
import {
  useLazyFolderTree,
  PLACEHOLDER_PREFIX,
} from "../../../api/hooks/useLazyFolderTree";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/Button";
import { Stack } from "../../ui/Stack";
import { Group } from "../../ui/Group";
import { Text } from "../../ui/Text";
import { TextColorEnum } from "../../../enums/ui/TextColorEnum";
import { FolderTreeNode } from "./FolderTreeNode";
import { buildTreeData } from "./buildTreeData";

const ROOT_VALUE = "root";

interface IProps {
  opened: boolean;
  currentFolderId: string | null;
  isMoving: boolean;
  onClose: () => void;
  onConfirm: (targetFolder: ILocalFolder | null) => void;
  disabledFolders?: string[];
}

export const MoveItemModal = ({
  opened,
  currentFolderId,
  isMoving,
  onClose,
  onConfirm,
  disabledFolders,
}: IProps) => {
  const { t } = useTranslation();
  const { treeData: folderTree, folderMap, expandNode } = useLazyFolderTree(opened);

  const treeData = useMemo(
    () => buildTreeData(folderTree, t("files.moveItem.rootFolder")),
    [folderTree, t],
  );

  const disabledFolderIds = useMemo(() => {
    const ids = new Set<string>();
    if (!disabledFolders) return ids;

    disabledFolders.forEach((id) => ids.add(id));
    return ids;
  }, [disabledFolders]);

  const tree = useTree({
    initialExpandedState: { [ROOT_VALUE]: true },
  });

  const isDisabled = (value: string) => {
    if (currentFolderId === null && value === ROOT_VALUE) return true;
    return disabledFolderIds.has(value);
  };

  const handleClose = () => {
    tree.clearSelected();
    onClose();
  };

  const handleConfirm = () => {
    const selected = tree.selectedState[0];
    if (!selected || selected.startsWith(PLACEHOLDER_PREFIX)) return;

    const targetFolder = selected === ROOT_VALUE ? null : (folderMap[selected] ?? null);
    onConfirm(targetFolder);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("files.moveItem.title")}
    >
      <Stack>
        <Text size="sm" c={TextColorEnum.TERTIARY}>
          {t("files.moveItem.description")}
        </Text>
        <Text size="sm">{t("files.moveItem.selectLabel")}</Text>
        <Tree
          data={treeData}
          tree={tree}
          selectOnClick
          renderNode={(payload) => (
            <FolderTreeNode
              {...payload}
              disabled={isDisabled(payload.node.value)}
              onExpand={expandNode}
            />
          )}
        />
        <Group justify="space-between">
          <Button variant="default" onClick={handleClose}>
            {t("files.moveItem.cancel")}
          </Button>
          <Button
            loading={isMoving}
            disabled={tree.selectedState.length === 0}
            onClick={handleConfirm}
          >
            {t("files.moveItem.submit")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
