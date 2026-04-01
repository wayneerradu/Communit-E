import type { Fault, PlatformSettings } from "@/types/domain";

export type FaultTemplateKind =
  | "faultInitialEscalation"
  | "faultEscalatePlus"
  | "faultEscalatePlusPlus"
  | "faultReopened";

type RenderInput = {
  fault: Fault;
  templateKind: FaultTemplateKind;
  settings: PlatformSettings;
  reopenReason?: string;
  adminName?: string;
  adminEmail?: string;
};

export function buildFaultTrackingToken(fault: Fault) {
  const faultToken = fault.id.trim();
  const residentToken = fault.residentId?.trim() || "none";
  return `UIC-F:${faultToken}|R:${residentToken}`;
}

export function parseFaultTrackingToken(input: string) {
  const match = input.match(/UIC-F:([^| \]]+)\|R:([^\] \n\r]+)/i);
  if (!match) {
    return null;
  }
  const faultId = match[1]?.trim();
  const residentId = match[2]?.trim();
  if (!faultId) return null;
  return {
    faultId,
    residentId: residentId && residentId !== "none" ? residentId : undefined
  };
}

function toDaysOpen(fault: Fault) {
  const anchor = fault.escalatedAt ?? fault.createdAt ?? fault.updatedAt;
  if (!anchor) return "0";
  const ms = Date.now() - new Date(anchor).getTime();
  if (!Number.isFinite(ms)) return "0";
  return String(Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24))));
}

function replaceTokens(template: string, tokens: Record<string, string>) {
  let next = template;
  for (const [token, value] of Object.entries(tokens)) {
    next = next.split(`{${token}}`).join(value);
  }
  return next;
}

function selectTemplate(settings: PlatformSettings, templateKind: FaultTemplateKind) {
  return settings.communicationTemplates[templateKind];
}

export function renderFaultEmailTemplate(input: RenderInput) {
  const template = selectTemplate(input.settings, input.templateKind);
  const trackingToken = buildFaultTrackingToken(input.fault);
  const tokens: Record<string, string> = {
    faultId: input.fault.id,
    residentId: input.fault.residentId ?? "",
    faultRef: input.fault.ethekwiniReference ?? input.fault.id,
    title: input.fault.title,
    category: input.fault.category,
    subCategory: input.fault.subCategory ?? "N/A",
    priority: input.fault.priority,
    location: input.fault.locationText,
    reportedBy: input.adminName ?? input.fault.loggedByAdminName ?? "Admin",
    officeBearerName: input.adminName ?? input.fault.loggedByAdminName ?? "Admin",
    officeBearerEmail: input.adminEmail ?? input.fault.loggedByAdminEmail ?? "hello@unityincommunity.org.za",
    daysOpen: toDaysOpen(input.fault),
    reopenReason: input.reopenReason ?? input.fault.reopenReason ?? "Not provided",
    trackingToken
  };

  const baseSubject = replaceTokens(template.subjectTemplate, tokens).trim();
  const subject = `${baseSubject} [${trackingToken}]`;

  const bodyContent = replaceTokens(template.bodyTemplate, tokens).trim();
  const signature = replaceTokens(template.signature, tokens).trim();
  const body = [
    bodyContent,
    "",
    "---",
    `Tracking Token: ${trackingToken}`,
    "Please keep this token in replies for automated matching.",
    "",
    signature
  ].join("\n");

  return {
    enabled: template.enabled,
    subject,
    body,
    trackingToken
  };
}
