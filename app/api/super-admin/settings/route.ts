import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { updatePlatformSettings, readPlatformSettings } from "@/lib/platform-store";

const schema = z.object({
  faultEscalation: z
    .object({
      initialContacts: z.array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(2),
          email: z.string().email(),
          active: z.boolean()
        })
      ),
      escalatePlusBySubCategory: z.record(
        z.array(
          z.object({
            id: z.string().min(1),
            name: z.string().min(2),
            email: z.string().email(),
            active: z.boolean()
          })
        )
      ),
      escalatePlusPlusBySubCategory: z.record(
        z.array(
          z.object({
            id: z.string().min(1),
            name: z.string().min(2),
            email: z.string().email(),
            active: z.boolean()
          })
        )
      )
    })
    .optional(),
  googleWorkspace: z
    .object({
      workspaceDomain: z.string().min(3),
      clientId: z.string().min(3),
      allowedDomains: z.array(z.string()).min(1),
      callbackUrl: z.string().url(),
      googleMapsApiKey: z.string(),
      residentsMapDefaultCenter: z.object({
        label: z.string().min(3),
        latitude: z.number(),
        longitude: z.number(),
        zoom: z.number().int().min(10).max(18)
      }).optional(),
      clientSecretConfigured: z.boolean().optional()
    })
    .optional(),
  googleCalendar: z
    .object({
      enabled: z.boolean(),
      syncMode: z.enum(["read-only", "read-write"]),
      calendarName: z.string().min(2),
      calendarId: z.string().min(3),
      connectedAccount: z.string(),
      connectionStatus: z.enum(["connected", "pending"]).optional(),
      grantedScopes: z.array(z.string()),
      lastSyncedAt: z.string(),
      refreshTokenConfigured: z.boolean()
    })
    .optional(),
  publicJoinProtection: z
    .object({
      turnstileEnabled: z.boolean(),
      turnstileSiteKey: z.string(),
      turnstileSecretConfigured: z.boolean(),
      minimumCompletionSeconds: z.number().int().min(1).max(30)
    })
    .optional(),
  triageMailbox: z
    .object({
      address: z.string().email(),
      senderName: z.string().min(2),
      primaryChannel: z.boolean()
    })
    .optional(),
  telegram: z
    .object({
      botName: z.string().min(2),
      groupName: z.string().min(2),
      botTokenConfigured: z.boolean(),
      chatIdConfigured: z.boolean()
    })
    .optional(),
  notificationPolicy: z
    .object({
      quietHoursStart: z.string().min(4),
      quietHoursEnd: z.string().min(4),
      quietDays: z.array(z.string()),
      telegramCriticalOnly: z.boolean()
    })
    .optional(),
  communicationSettings: z
    .object({
      email: z.object({
        mode: z.enum(["off", "live", "demo"]),
        liveRecipients: z.array(z.string().email()),
        demoRecipients: z.array(z.string().email())
      }),
      telegram: z.object({
        mode: z.enum(["off", "live", "demo"]),
        liveGroupName: z.string().min(2),
        liveChatId: z.string(),
        demoGroupName: z.string().min(2),
        demoChatId: z.string(),
        demoBotToken: z.string()
      }),
      councillor: z.object({
        name: z.string(),
        email: z.string().email().or(z.literal("")),
        cellNumber: z.string()
      })
    })
    .optional(),
  communicationTemplates: z
    .object({
      faultInitialEscalation: z.object({
        enabled: z.boolean(),
        subjectTemplate: z.string().min(3),
        bodyTemplate: z.string().min(10),
        signature: z.string().min(3)
      }),
      faultEscalatePlus: z.object({
        enabled: z.boolean(),
        subjectTemplate: z.string().min(3),
        bodyTemplate: z.string().min(10),
        signature: z.string().min(3)
      }),
      faultEscalatePlusPlus: z.object({
        enabled: z.boolean(),
        subjectTemplate: z.string().min(3),
        bodyTemplate: z.string().min(10),
        signature: z.string().min(3)
      }),
      faultReopened: z.object({
        enabled: z.boolean(),
        subjectTemplate: z.string().min(3),
        bodyTemplate: z.string().min(10),
        signature: z.string().min(3)
      })
    })
    .optional(),
  wordpress: z
    .object({
      enabled: z.boolean(),
      baseUrl: z.string(),
      username: z.string(),
      appPassword: z.string().optional(),
      defaultStatus: z.enum(["draft", "publish"]),
      defaultCategory: z.string().min(2),
      categories: z.array(z.string().min(2)).min(1)
    })
    .optional(),
  sessionPolicy: z
    .object({
      idleTimeoutMinutes: z.number().int().min(5),
      absoluteSessionHours: z.number().int().min(1),
      warnBeforeExpiryMinutes: z.number().int().min(1),
      allowMultipleSessions: z.boolean()
    })
    .optional(),
  branding: z
    .object({
      platformFont: z.string().min(2),
      logoMode: z.enum(["default", "event"]),
      emailTheme: z.string().min(2),
      platformSubtitle: z.string().min(2),
      organisationName: z.string().min(2),
      logoImage: z.string()
    })
    .optional()
});

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await readPlatformSettings();
  return NextResponse.json({
    item: {
      ...settings,
      wordpress: {
        ...settings.wordpress,
        appPassword: ""
      }
    }
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = schema.parse(await request.json());
  const next = await updatePlatformSettings((current) => {
    const updated = { ...current };

    if (payload.googleWorkspace) {
      updated.googleWorkspace = {
        ...updated.googleWorkspace,
        ...payload.googleWorkspace,
        status:
          payload.googleWorkspace.clientId && updated.googleWorkspace.clientSecretConfigured
            ? "connected"
            : "pending"
      };
    }

    if (payload.googleCalendar) {
      updated.googleCalendar = {
        ...updated.googleCalendar,
        ...payload.googleCalendar,
        connectionStatus:
          payload.googleCalendar.connectedAccount.trim() && payload.googleCalendar.refreshTokenConfigured
            ? "connected"
            : "pending"
      };
    }

    if (payload.publicJoinProtection) {
      updated.publicJoinProtection = {
        ...updated.publicJoinProtection,
        ...payload.publicJoinProtection
      };
    }

    if (payload.triageMailbox) {
      updated.triageMailbox = {
        ...updated.triageMailbox,
        ...payload.triageMailbox
      };
    }

    if (payload.telegram) {
      updated.telegram = {
        ...updated.telegram,
        ...payload.telegram,
        status: payload.telegram.botTokenConfigured && payload.telegram.chatIdConfigured ? "connected" : "pending"
      };
    }

    if (payload.notificationPolicy) {
      updated.notificationPolicy = {
        ...updated.notificationPolicy,
        ...payload.notificationPolicy
      };
    }

    if (payload.communicationSettings) {
      updated.communicationSettings = {
        ...updated.communicationSettings,
        email: {
          ...updated.communicationSettings.email,
          ...payload.communicationSettings.email
        },
        telegram: {
          ...updated.communicationSettings.telegram,
          ...payload.communicationSettings.telegram
        },
        councillor: {
          ...updated.communicationSettings.councillor,
          ...payload.communicationSettings.councillor
        }
      };
    }

    if (payload.communicationTemplates) {
      updated.communicationTemplates = {
        ...updated.communicationTemplates,
        ...payload.communicationTemplates
      };
    }

    if (payload.wordpress) {
      updated.wordpress = {
        ...updated.wordpress,
        ...payload.wordpress,
        appPassword: ""
      };
    }

    if (payload.sessionPolicy) {
      updated.sessionPolicy = {
        ...updated.sessionPolicy,
        ...payload.sessionPolicy
      };
    }

    if (payload.branding) {
      updated.branding = {
        ...updated.branding,
        ...payload.branding
      };
    }

    if (payload.faultEscalation) {
      updated.faultEscalation = {
        ...updated.faultEscalation,
        ...payload.faultEscalation
      };
    }

    updated.updatedAt = new Date().toISOString();
    return updated;
  });

  return NextResponse.json({ item: next });
}
