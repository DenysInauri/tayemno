import type { TreeNodeData } from "@mantine/core";
import type { IFolderTreeNode } from "../../../../api/hooks/useLazyFolderTree";

const ROOT_VALUE = "root";

const mapNode = (node: IFolderTreeNode): TreeNodeData => ({
  value: node.id,
  label: node.name,
  children: node.children.map(mapNode),
});

export const buildTreeData = (
  folders: IFolderTreeNode[],
  rootLabel: string,
): TreeNodeData[] => [
  {
    value: ROOT_VALUE,
    label: rootLabel,
    children: folders.map(mapNode),
  },
];
