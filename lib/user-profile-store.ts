import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UserProfile } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const profilesFile = path.join(dataDir, "user-profiles.json");
const seededAdminProfiles: UserProfile[] = [
  {
    email: "wayne.erradu@unityincommunity.org.za",
    fullName: "Wayne Erradu",
    status: "active"
  },
  {
    email: "hello@unityincommunity.org.za",
    fullName: "Hello Mailbox",
    status: "active"
  },
  {
    email: "sarah.basson@unityincommunity.org.za",
    fullName: "Sarah Basson",
    status: "active"
  },
  {
    email: "marvin.naicker@unityincommunity.org.za",
    fullName: "Marvin Naicker",
    status: "active"
  },
  {
    email: "nomasonto.ncgungane@unityincommunity.org.za",
    fullName: "Nomasonto Ncgungane",
    status: "active"
  },
  {
    email: "bronwynne.batstone@unityincommunity.org.za",
    fullName: "Bronwynne Batstone",
    status: "active"
  },
  {
    email: "vishal.kanhai@unityincommunity.org.za",
    fullName: "Vishal Kanhai",
    status: "active"
  }
];

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
    const parsed = JSON.parse(stripBom(content)) as UserProfile[];
    const merged = mergeSeedProfiles(parsed);
    if (merged.length !== parsed.length) {
      await writeProfiles(merged);
    }
    return merged;
  } catch {
    await writeProfiles(seededAdminProfiles);
    return [...seededAdminProfiles];
  }
}

function mergeSeedProfiles(existing: UserProfile[]) {
  const byEmail = new Map<string, UserProfile>();
  existing.forEach((profile) => {
    const email = profile.email?.trim().toLowerCase();
    if (!email) return;
    byEmail.set(email, { ...profile, email });
  });

  seededAdminProfiles.forEach((profile) => {
    const email = profile.email.toLowerCase();
    if (!byEmail.has(email)) {
      byEmail.set(email, { ...profile, email });
      return;
    }

    const current = byEmail.get(email)!;
    if (!current.fullName?.trim()) {
      byEmail.set(email, { ...current, fullName: profile.fullName });
    }
  });

  return Array.from(byEmail.values()).sort((left, right) => left.fullName.localeCompare(right.fullName));
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
