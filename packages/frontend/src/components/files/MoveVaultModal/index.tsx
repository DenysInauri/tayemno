import { useTranslation } from "react-i18next";
import { Tree, useTree, getTreeExpandedState } from "@mantine/core";
import type { TreeNodeData, RenderTreeNodePayload } from "@mantine/core";
import {
  IconFolder,
  IconFolderOpen,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react";
import type { IFolderTreeNode } from "@tayemno/shared";

import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/Button";
import { Stack } from "../../ui/Stack";
import { Group } from "../../ui/Group";
import { Text } from "../../ui/Text";
import { TextColorEnum } from "../../../enums/ui/TextColorEnum";

const ROOT_VALUE = "root";

interface IProps {
  opened: boolean;
  currentFolderId: string | null;
  folderTree: IFolderTreeNode[];
  isMoving: boolean;
  onClose: () => void;
  onConfirm: (targetFolderId: string | null) => void;
}

const buildTreeData = (
  folders: IFolderTreeNode[],
  rootLabel: string,
): TreeNodeData[] => {
  const mapNode = (node: IFolderTreeNode): TreeNodeData => ({
    value: node.id,
    label: node.name,
    children: node.children.length > 0 ? node.children.map(mapNode) : undefined,
  });

  return [
    {
      value: ROOT_VALUE,
      label: rootLabel,
      children: folders.map(mapNode),
    },
  ];
};

export const MoveVaultModal = ({
  opened,
  currentFolderId,
  folderTree,
  isMoving,
  onClose,
  onConfirm,
}: IProps) => {
  const { t } = useTranslation();

  const treeData = buildTreeData(folderTree, t("files.moveVault.rootFolder"));

  const tree = useTree({
    initialExpandedState: getTreeExpandedState(treeData, "*"),
  });

  const isDisabled = (value: string) => {
    if (currentFolderId === null && value === ROOT_VALUE) return true;
    return value === currentFolderId;
  };

  const handleClose = () => {
    tree.clearSelected();
    onClose();
  };

  const handleConfirm = () => {
    const selected = tree.selectedState[0];
    if (!selected) return;

    const targetFolderId = selected === ROOT_VALUE ? null : selected;
    onConfirm(targetFolderId);
  };

  const renderNode = ({
    node,
    hasChildren,
    expanded,
    elementProps,
  }: RenderTreeNodePayload) => {
    const disabled = isDisabled(node.value);

    return (
      <div
        {...elementProps}
        onClick={(e) => {
          if (disabled) {
            e.stopPropagation();
            return;
          }
          elementProps.onClick(e);
        }}
        style={{
          ...elementProps.style,
          display: "flex",
          alignItems: "center",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {hasChildren &&
          (expanded ? (
            <IconChevronDown size={14} style={{ marginRight: 4 }} />
          ) : (
            <IconChevronRight size={14} style={{ marginRight: 4 }} />
          ))}
        {expanded ? (
          <IconFolderOpen size={16} style={{ marginRight: 6 }} />
        ) : (
          <IconFolder size={16} style={{ marginRight: 6 }} />
        )}
        <span>{node.label}</span>
      </div>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("files.moveVault.title")}
    >
      <Stack>
        <Text size="sm" c={TextColorEnum.TERTIARY}>
          {t("files.moveVault.description")}
        </Text>
        <Text size="sm">{t("files.moveVault.selectLabel")}</Text>
        <Tree
          data={treeData}
          tree={tree}
          selectOnClick
          renderNode={renderNode}
        />
        <Group justify="space-between">
          <Button variant="default" onClick={handleClose}>
            {t("files.moveVault.cancel")}
          </Button>
          <Button
            loading={isMoving}
            disabled={tree.selectedState.length === 0}
            onClick={handleConfirm}
          >
            {t("files.moveVault.submit")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
