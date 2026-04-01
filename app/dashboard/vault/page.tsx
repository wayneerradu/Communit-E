import { VaultConsole } from "@/components/vault/vault-console";
import { getVaultData } from "@/lib/hub-data";

export default function VaultPage() {
  const { vaultAssets } = getVaultData();

  return <VaultConsole initialAssets={vaultAssets} />;
}
