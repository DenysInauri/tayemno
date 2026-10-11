import { zipSync } from "fflate";
import type { ITreeNode } from "../fetchFolderTree";

export const zipEmptyTree = (tree: ITreeNode, folderName: string): Blob => {
  const zipData: Record<string, Uint8Array> = {};

  const addEmptyDirs = (node: ITreeNode, path: string) => {
    if (node.children.length === 0 && node.vaults.length === 0) {
      zipData[path + "/"] = new Uint8Array(0);
    }
    for (const child of node.children) {
      addEmptyDirs(child, `${path}/${child.folder.name}`);
    }
  };

  for (const child of tree.children) {
    addEmptyDirs(child, child.folder.name);
  }

  if (Object.keys(zipData).length === 0) {
    zipData["/"] = new Uint8Array(0);
  }

  const zipped = zipSync(zipData);
  return new Blob([zipped], { type: "application/zip" });
};
