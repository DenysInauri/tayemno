import type { Vault } from "@tayemno/shared";

import { VaultListItem } from "../VaultListItem";

interface IProps {
  vaults: Vault[];
}

export const VaultsList = ({ vaults }: IProps) => (
  <>
    {vaults.map((vault) => (
      <VaultListItem key={vault.id} vault={vault} />
    ))}
  </>
);
