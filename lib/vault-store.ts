import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { vaultAssets as seedVaultAssets } from "@/lib/demo-data";
import type { VaultAsset } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const vaultFile = path.join(dataDir, "vault-assets.json");

function ensureVaultStoreFile<T>(filePath: string, seedData: T) {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  if (!existsSync(filePath)) {
    writeFileSync(filePath, `${JSON.stringify(seedData, null, 2)}\n`, "utf8");
  }
}

function readJsonFile<T>(filePath: string, seedData: T): T {
  ensureVaultStoreFile(filePath, seedData);
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeJsonFile<T>(filePath: string, value: T) {
  ensureVaultStoreFile(filePath, value);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readVaultStore() {
  return readJsonFile<VaultAsset[]>(vaultFile, seedVaultAssets);
}

export function writeVaultStore(items: VaultAsset[]) {
  writeJsonFile(vaultFile, items);
}
