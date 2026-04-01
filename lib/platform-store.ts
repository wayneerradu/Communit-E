import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { platformControlCenter, platformServices, platformSettings } from "@/lib/demo-data";
import type { PlatformControlCenter, PlatformService, PlatformSettings } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const settingsFile = path.join(dataDir, "platform-settings.json");
const servicesFile = path.join(dataDir, "platform-services.json");
const controlCenterFile = path.join(dataDir, "platform-control-center.json");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

function stripBom(content: string) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

export async function readPlatformSettings(): Promise<PlatformSettings> {
  await ensureDataDir();
  try {
    const content = await readFile(settingsFile, "utf8");
    const normalized = stripBom(content).trim();
    if (!normalized) {
      return platformSettings;
    }

    const parsed = JSON.parse(normalized) as Partial<PlatformSettings>;
    return {
      ...platformSettings,
      ...parsed,
      communicationSettings: {
        email: {
          ...platformSettings.communicationSettings.email,
          ...(parsed.communicationSettings?.email ?? {})
        },
        telegram: {
          ...platformSettings.communicationSettings.telegram,
          ...(parsed.communicationSettings?.telegram ?? {})
        },
        councillor: {
          ...platformSettings.communicationSettings.councillor,
          ...(parsed.communicationSettings?.councillor ?? {})
        }
      },
      communicationTemplates: {
        faultInitialEscalation: {
          ...platformSettings.communicationTemplates.faultInitialEscalation,
          ...(parsed.communicationTemplates?.faultInitialEscalation ?? {})
        },
        faultEscalatePlus: {
          ...platformSettings.communicationTemplates.faultEscalatePlus,
          ...(parsed.communicationTemplates?.faultEscalatePlus ?? {})
        },
        faultEscalatePlusPlus: {
          ...platformSettings.communicationTemplates.faultEscalatePlusPlus,
          ...(parsed.communicationTemplates?.faultEscalatePlusPlus ?? {})
        },
        faultReopened: {
          ...platformSettings.communicationTemplates.faultReopened,
          ...(parsed.communicationTemplates?.faultReopened ?? {})
        }
      }
    };
  } catch {
    return platformSettings;
  }
}

export async function writePlatformSettings(settings: PlatformSettings) {
  await ensureDataDir();
  await writeFile(settingsFile, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export async function readPlatformServices(): Promise<PlatformService[]> {
  await ensureDataDir();
  try {
    const content = await readFile(servicesFile, "utf8");
    const normalized = stripBom(content).trim();
    return normalized ? (JSON.parse(normalized) as PlatformService[]) : platformServices;
  } catch {
    return platformServices;
  }
}

export async function writePlatformServices(services: PlatformService[]) {
  await ensureDataDir();
  await writeFile(servicesFile, `${JSON.stringify(services, null, 2)}\n`, "utf8");
}

export async function readPlatformControlCenter(): Promise<PlatformControlCenter> {
  await ensureDataDir();
  try {
    const content = await readFile(controlCenterFile, "utf8");
    const normalized = stripBom(content).trim();
    return normalized ? (JSON.parse(normalized) as PlatformControlCenter) : platformControlCenter;
  } catch {
    return platformControlCenter;
  }
}

export async function writePlatformControlCenter(controlCenter: PlatformControlCenter) {
  await ensureDataDir();
  await writeFile(controlCenterFile, `${JSON.stringify(controlCenter, null, 2)}\n`, "utf8");
}

export async function updatePlatformControlCenter(
  updater: (current: PlatformControlCenter) => PlatformControlCenter | Promise<PlatformControlCenter>
) {
  const current = await readPlatformControlCenter();
  const next = await updater(current);
  await writePlatformControlCenter(next);
  return next;
}

export async function updatePlatformSettings(
  updater: (current: PlatformSettings) => PlatformSettings | Promise<PlatformSettings>
) {
  const current = await readPlatformSettings();
  const next = await updater(current);
  await writePlatformSettings(next);
  return next;
}

export async function updatePlatformServices(
  updater: (current: PlatformService[]) => PlatformService[] | Promise<PlatformService[]>
) {
  const current = await readPlatformServices();
  const next = await updater(current);
  await writePlatformServices(next);
  return next;
}
