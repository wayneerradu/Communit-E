export const LOCAL_SUPERADMIN_EMAIL =
  process.env.LOCAL_SUPERADMIN_EMAIL?.trim().toLowerCase() || "superadmin@unityincommunity.org.za";

export const LOCAL_SUPERADMIN_PASSWORD = process.env.LOCAL_SUPERADMIN_PASSWORD || "";

export function isLocalSuperAdminEnabled() {
  return process.env.NODE_ENV !== "production" && LOCAL_SUPERADMIN_PASSWORD.trim().length >= 8;
}

export function isLocalSuperAdminLogin(email: string, password: string) {
  if (!isLocalSuperAdminEnabled()) {
    return false;
  }

  return email.trim().toLowerCase() === LOCAL_SUPERADMIN_EMAIL && password === LOCAL_SUPERADMIN_PASSWORD;
}
