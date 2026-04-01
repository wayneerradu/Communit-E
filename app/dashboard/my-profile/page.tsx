import { getSessionUser } from "@/lib/auth";
import { getConfiguredWorkspaceUsers } from "@/lib/identity";
import { readAllUserProfiles, readUserProfile } from "@/lib/user-profile-store";
import { MyProfileConsole } from "@/components/profile/my-profile-console";

export default async function MyProfilePage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const profile = await readUserProfile(user.email);
  const knownProfiles = await readAllUserProfiles();
  const knownUsers = new Map<string, { email: string; fullName: string }>();

  getConfiguredWorkspaceUsers().forEach((item) => {
    if (item.email.toLowerCase() !== user.email.toLowerCase()) {
      knownUsers.set(item.email.toLowerCase(), {
        email: item.email,
        fullName: item.name
      });
    }
  });

  knownProfiles.forEach((item) => {
    if (item.email.toLowerCase() !== user.email.toLowerCase()) {
      knownUsers.set(item.email.toLowerCase(), {
        email: item.email,
        fullName: item.nickname?.trim() || item.fullName
      });
    }
  });

  return (
    <MyProfileConsole
      initialProfile={{
        fullName: user.name,
        email: user.email,
        nickname: profile?.nickname ?? "",
        bio: profile?.bio ?? "",
        dateOfBirth: profile?.dateOfBirth ?? "",
        physicalAddress: profile?.physicalAddress ?? "",
        mobileNumber: profile?.mobileNumber ?? "",
        privateNotes: profile?.privateNotes ?? "",
        delegateEmail: profile?.delegateEmail ?? "",
        status: profile?.status ?? "active",
        avatarImage: profile?.avatarImage ?? ""
      }}
      delegateOptions={Array.from(knownUsers.values()).sort((left, right) => left.fullName.localeCompare(right.fullName))}
    />
  );
}
