export const LOCAL_SUPERADMIN_EMAIL =
  process.env.LOCAL_SUPERADMIN_EMAIL?.trim().toLowerCase() || "superadmin@unityincommunity.org.za";

export const LOCAL_SUPERADMIN_PASSWORD =
  process.env.LOCAL_SUPERADMIN_PASSWORD || "CommunitE!2026";

export function isLocalSuperAdminLogin(email: string, password: string) {
  return email.trim().toLowerCase() === LOCAL_SUPERADMIN_EMAIL && password === LOCAL_SUPERADMIN_PASSWORD;
}
