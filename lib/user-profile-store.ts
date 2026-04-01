import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UserProfile } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const profilesFile = path.join(dataDir, "user-profiles.json");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

function stripBom(content: string) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

async function readProfiles(): Promise<UserProfile[]> {
  await ensureDataDir();

  try {
    const content = await readFile(profilesFile, "utf8");
    return JSON.parse(stripBom(content)) as UserProfile[];
  } catch {
    return [];
  }
}

export async function readAllUserProfiles() {
  return readProfiles();
}

async function writeProfiles(profiles: UserProfile[]) {
  await ensureDataDir();
  await writeFile(profilesFile, `${JSON.stringify(profiles, null, 2)}\n`, "utf8");
}

export async function readUserProfile(email: string) {
  const profiles = await readProfiles();
  return profiles.find((profile) => profile.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function upsertUserProfile(profile: UserProfile) {
  const profiles = await readProfiles();
  const index = profiles.findIndex((item) => item.email.toLowerCase() === profile.email.toLowerCase());

  if (index >= 0) {
    profiles[index] = {
      ...profiles[index],
      ...profile
    };
  } else {
    profiles.push(profile);
  }

  await writeProfiles(profiles);
  return profile;
}
