import type { Role, SessionUser } from "@/types/domain";

const DEFAULT_ALLOWED_DOMAIN = "unityincommunity.org.za";
const DEFAULT_SUPER_ADMIN_EMAILS = new Set([
  "wayne.erradu@unityincommunity.org.za",
  "hello@unityincommunity.org.za"
]);
const DEFAULT_ADMIN_EMAILS = new Set([
  "sarah.basson@unityincommunity.org.za",
  "marvin.naicker@unityincommunity.org.za",
  "nomasonto.ncgungane@unityincommunity.org.za",
  "bronwynne.batstone@unityincommunity.org.za",
  "vishal.kanhai@unityincommunity.org.za"
]);

function parseEmailList(value?: string) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getConfiguredWorkspaceUsers() {
  const emails = new Set<string>();
  DEFAULT_SUPER_ADMIN_EMAILS.forEach((email) => emails.add(email));
  DEFAULT_ADMIN_EMAILS.forEach((email) => emails.add(email));

  parseEmailList(process.env.SUPER_ADMIN_EMAILS).forEach((email) => emails.add(email));
  parseEmailList(process.env.ADMIN_EMAILS).forEach((email) => emails.add(email));

  return Array.from(emails)
    .sort((left, right) => left.localeCompare(right))
    .map((email) => toSessionUser(email));
}

export function getAllowedWorkspaceDomain() {
  return (process.env.ALLOWED_WORKSPACE_DOMAIN ?? DEFAULT_ALLOWED_DOMAIN).trim().toLowerCase();
}

export function isAllowedWorkspaceEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === getAllowedWorkspaceDomain();
}

export function resolveRoleForEmail(email: string): Role {
  const normalizedEmail = email.trim().toLowerCase();
  const superAdminEmails = new Set([...DEFAULT_SUPER_ADMIN_EMAILS, ...parseEmailList(process.env.SUPER_ADMIN_EMAILS)]);
  const adminEmails = new Set([...DEFAULT_ADMIN_EMAILS, ...parseEmailList(process.env.ADMIN_EMAILS)]);

  if (superAdminEmails.has(normalizedEmail)) {
    return "SUPER_ADMIN";
  }

  if (adminEmails.has(normalizedEmail)) {
    return "ADMIN";
  }

  return "ADMIN";
}

export function toSessionUser(email: string, name?: string): SessionUser {
  const normalizedEmail = email.trim().toLowerCase();
  const derivedName = normalizedEmail
    .split("@")[0]
    ?.split(/[.\-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    id: normalizedEmail,
    email: normalizedEmail,
    name: name?.trim() || derivedName || "CommUNIT-E Admin",
    role: resolveRoleForEmail(normalizedEmail)
  };
}

