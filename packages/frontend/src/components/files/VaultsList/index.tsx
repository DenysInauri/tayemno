import type { ILocalVault } from "../../../types/local";

import { VaultListItem } from "../VaultListItem";

interface IProps {
  vaults: ILocalVault[];
}

export const VaultsList = ({ vaults }: IProps) => (
  <>
    {vaults.map((vault) => (
      <VaultListItem key={vault.id} vault={vault} />
    ))}
  </>
);
