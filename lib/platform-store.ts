import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readDbJsonStore, writeDbJsonStore } from "@/lib/db-json-store";
import path from "node:path";
import { platformControlCenter, platformServices, platformSettings } from "@/lib/demo-data";
import type { PlatformControlCenter, PlatformService, PlatformSettings } from "@/types/domain";

const dataDir = path.join(process.cwd(), "data");
const settingsFile = path.join(dataDir, "platform-settings.json");
const servicesFile = path.join(dataDir, "platform-services.json");
const controlCenterFile = path.join(dataDir, "platform-control-center.json");
const settingsDbKey = "platform-settings";
const servicesDbKey = "platform-services";
const controlCenterDbKey = "platform-control-center";

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

function stripBom(content: string) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

export async function readPlatformSettings(): Promise<PlatformSettings> {
  const dbSettings = await readDbJsonStore<Partial<PlatformSettings>>(settingsDbKey);
  if (dbSettings) {
    const parsed = dbSettings;
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
      },
      wordpress: {
        ...platformSettings.wordpress,
        ...(parsed.wordpress ?? {}),
        appPassword: ""
      }
    };
  }

  await ensureDataDir();
  try {
    const content = await readFile(settingsFile, "utf8");
    const normalized = stripBom(content).trim();
    if (!normalized) {
      return platformSettings;
    }

    const parsed = JSON.parse(normalized) as Partial<PlatformSettings>;
    await writeDbJsonStore(settingsDbKey, parsed);
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
      },
      wordpress: {
        ...platformSettings.wordpress,
        ...(parsed.wordpress ?? {}),
        appPassword: ""
      }
    };
  } catch {
    return platformSettings;
  }
}

export async function writePlatformSettings(settings: PlatformSettings) {
  const sanitized: PlatformSettings = {
    ...settings,
    wordpress: {
      ...settings.wordpress,
      appPassword: ""
    }
  };

  await ensureDataDir();
  await writeFile(settingsFile, `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");
  await writeDbJsonStore(settingsDbKey, sanitized);
}

export async function readPlatformServices(): Promise<PlatformService[]> {
  const dbServices = await readDbJsonStore<PlatformService[]>(servicesDbKey);
  if (dbServices) {
    return dbServices;
  }

  await ensureDataDir();
  try {
    const content = await readFile(servicesFile, "utf8");
    const normalized = stripBom(content).trim();
    const parsed = normalized ? (JSON.parse(normalized) as PlatformService[]) : platformServices;
    await writeDbJsonStore(servicesDbKey, parsed);
    return parsed;
  } catch {
    return platformServices;
  }
}

export async function writePlatformServices(services: PlatformService[]) {
  await ensureDataDir();
  await writeFile(servicesFile, `${JSON.stringify(services, null, 2)}\n`, "utf8");
  await writeDbJsonStore(servicesDbKey, services);
}

export async function readPlatformControlCenter(): Promise<PlatformControlCenter> {
  const dbControlCenter = await readDbJsonStore<PlatformControlCenter>(controlCenterDbKey);
  if (dbControlCenter) {
    return dbControlCenter;
  }

  await ensureDataDir();
  try {
    const content = await readFile(controlCenterFile, "utf8");
    const normalized = stripBom(content).trim();
    const parsed = normalized ? (JSON.parse(normalized) as PlatformControlCenter) : platformControlCenter;
    await writeDbJsonStore(controlCenterDbKey, parsed);
    return parsed;
  } catch {
    return platformControlCenter;
  }
}

export async function writePlatformControlCenter(controlCenter: PlatformControlCenter) {
  await ensureDataDir();
  await writeFile(controlCenterFile, `${JSON.stringify(controlCenter, null, 2)}\n`, "utf8");
  await writeDbJsonStore(controlCenterDbKey, controlCenter);
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
