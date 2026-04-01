import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const connectionFile = path.join(dataDir, "google-calendar-connection.json");

export type GoogleCalendarConnection = {
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

export async function readGoogleCalendarConnection(): Promise<GoogleCalendarConnection | null> {
  try {
    await ensureDataDir();
    const content = await readFile(connectionFile, "utf8");
    return JSON.parse(stripBom(content)) as GoogleCalendarConnection;
  } catch {
    return null;
  }
}

export async function writeGoogleCalendarConnection(connection: GoogleCalendarConnection) {
  await ensureDataDir();
  await writeFile(connectionFile, `${JSON.stringify(connection, null, 2)}\n`, "utf8");
}
