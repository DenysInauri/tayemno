import type { Vault } from "@tayemno/shared";

import { FileListItem } from "../FileListItem";

interface IProps {
  vaults: Vault[];
}

export const VaultsList = ({ vaults }: IProps) => (
  <>
    {vaults.map((vault) => (
      <FileListItem
        key={vault.id}
        name={vault.name}
        isFolder={false}
        sizeBytes={vault.sizeBytes}
        updatedAt={vault.updatedAt}
        onClick={() => {}}
      />
    ))}
  </>
);
