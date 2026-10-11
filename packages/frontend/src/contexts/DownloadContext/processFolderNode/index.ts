import type { ITreeNode } from "../fetchFolderTree";
import { downloadAndDecryptVault } from "../downloadAndDecryptVault";

const FOLDER_DOWNLOAD_CONCURRENCY = 5;

interface IProcessFolderNodeDeps {
  workspaceId: string;
  signal: AbortSignal;
  zipEntries: Record<string, Uint8Array>;
  nextFileIndex: () => number;
  onFetchProgress: (idx: number, ratio: number) => void;
  onDecryptProgress: (idx: number, ratio: number) => void;
  onFileComplete: (idx: number) => void;
}

export const processFolderNode = async (
  node: ITreeNode,
  parentPath: string,
  deps: IProcessFolderNodeDeps,
) => {
  if (deps.signal.aborted) {
    throw new DOMException("Download aborted", "AbortError");
  }

  const executing = new Set<Promise<void>>();
  let firstError: Error | null = null;

  for (const vault of node.vaults) {
    if (deps.signal.aborted || firstError) break;

    const zipPath = parentPath ? `${parentPath}/${vault.name}` : vault.name;
    const idx = deps.nextFileIndex();

    const p = (async () => {
      const decryptedBlob = await downloadAndDecryptVault({
        vault,
        workspaceId: deps.workspaceId,
        signal: deps.signal,
        onFetchProgress: (ratio) => deps.onFetchProgress(idx, ratio),
        onDecryptProgress: (ratio) => deps.onDecryptProgress(idx, ratio),
      });

      const arrayBuffer = await decryptedBlob.arrayBuffer();
      deps.zipEntries[zipPath] = new Uint8Array(arrayBuffer);
      deps.onFileComplete(idx);
    })()
      .catch((err) => {
        if (!firstError) firstError = err;
      })
      .finally(() => {
        executing.delete(p);
      });
    executing.add(p);

    if (executing.size >= FOLDER_DOWNLOAD_CONCURRENCY) {
      await Promise.race(executing);
    }
  }

  await Promise.allSettled(executing);

  if (firstError) throw firstError;

  if (node.vaults.length === 0 && node.children.length === 0 && parentPath) {
    deps.zipEntries[parentPath + "/"] = new Uint8Array(0);
  }

  for (const child of node.children) {
    const childPath = parentPath
      ? `${parentPath}/${child.folder.name}`
      : child.folder.name;
    await processFolderNode(child, childPath, deps);
  }
};
