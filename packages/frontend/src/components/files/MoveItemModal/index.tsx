import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Tree, useTree, Loader } from "@mantine/core";
import type { TreeNodeData, RenderTreeNodePayload } from "@mantine/core";
import {
  IconFolder,
  IconFolderOpen,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react";
import type { IFolderTreeNode } from "../../../api/hooks/useLazyFolderTree";
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

const ROOT_VALUE = "root";

interface IProps {
  opened: boolean;
  currentFolderId: string | null;
  isMoving: boolean;
  onClose: () => void;
  onConfirm: (targetFolderId: string | null) => void;
  disabledFolders?: string[];
}

const buildTreeData = (
  folders: IFolderTreeNode[],
  rootLabel: string,
): TreeNodeData[] => {
  const mapNode = (node: IFolderTreeNode): TreeNodeData => ({
    value: node.id,
    label: node.name,
    children: node.children.map(mapNode),
  });

  return [
    {
      value: ROOT_VALUE,
      label: rootLabel,
      children: folders.map(mapNode),
    },
  ];
};

export const MoveItemModal = ({
  opened,
  currentFolderId,
  isMoving,
  onClose,
  onConfirm,
  disabledFolders,
}: IProps) => {
  const { t } = useTranslation();
  const { treeData: folderTree, expandNode } = useLazyFolderTree(opened);

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

    const targetFolderId = selected === ROOT_VALUE ? null : selected;
    onConfirm(targetFolderId);
  };

  const renderNode = ({
    node,
    hasChildren,
    expanded,
    elementProps,
  }: RenderTreeNodePayload) => {
    if (node.value.startsWith(PLACEHOLDER_PREFIX)) {
      return (
        <div
          {...elementProps}
          onClick={(e) => e.stopPropagation()}
          style={{ paddingLeft: 28, paddingTop: 4, paddingBottom: 4 }}
        >
          <Loader size={14} />
        </div>
      );
    }

    const disabled = isDisabled(node.value);

    return (
      <div
        {...elementProps}
        onClick={(e) => {
          if (hasChildren && !expanded && node.value !== ROOT_VALUE) {
            expandNode(node.value);
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
          renderNode={renderNode}
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
