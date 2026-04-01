import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const connectionFile = path.join(dataDir, "google-mailbox-connection.json");

export type GoogleMailboxConnection = {
  connectedAccount: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scopes: string[];
};

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

function stripBom(content: string) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

export async function readGoogleMailboxConnection(): Promise<GoogleMailboxConnection | null> {
  try {
    await ensureDataDir();
    const content = await readFile(connectionFile, "utf8");
    return JSON.parse(stripBom(content)) as GoogleMailboxConnection;
  } catch {
    return null;
  }
}

export async function writeGoogleMailboxConnection(connection: GoogleMailboxConnection) {
  await ensureDataDir();
  await writeFile(connectionFile, `${JSON.stringify(connection, null, 2)}\n`, "utf8");
}
