import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { listVisibleAdminNotifications } from "@/lib/notification-store";
import { readPlatformSettings } from "@/lib/platform-store";
import { readAllUserProfiles, readUserProfile } from "@/lib/user-profile-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const [settings, profile, profiles, notifications] = await Promise.all([
    readPlatformSettings(),
    readUserProfile(user.email),
    readAllUserProfiles(),
    listVisibleAdminNotifications(user.email)
  ]);
  const userWithProfile = {
    ...user,
    avatarImage: profile?.avatarImage ?? "",
    status: profile?.status ?? "active"
  };
  const teamProfiles = [
    {
      email: user.email,
      fullName: user.name,
      avatarImage: profile?.avatarImage ?? "",
      status: profile?.status ?? "active"
    },
    ...profiles.filter((item) => item.email.toLowerCase() !== user.email.toLowerCase())
  ];

  return (
    <AppShell
      user={userWithProfile}
      teamProfiles={teamProfiles}
      notifications={notifications.slice(0, 12)}
      platformSubtitle={settings.branding.platformSubtitle}
      logoImage={settings.branding.logoImage}
      organisationName={settings.branding.organisationName}
      communicationModes={{
        email: settings.communicationSettings.email.mode,
        telegram: settings.communicationSettings.telegram.mode
      }}
    >
      {children}
    </AppShell>
  );
}
