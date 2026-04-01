import { MeetingSchedulerConsole } from "@/components/meetings/meeting-scheduler-console";
import { getSessionUser } from "@/lib/auth";
import { getConfiguredWorkspaceUsers } from "@/lib/identity";
import { getResidentsData, getSuperAdminData } from "@/lib/hub-data";
import { readAllUserProfiles } from "@/lib/user-profile-store";

export default async function MeetingSchedulerPage() {
  const user = await getSessionUser();
  const { residents } = await getResidentsData();
  const { settings } = await getSuperAdminData();
  const knownProfiles = await readAllUserProfiles();
  const attendeeOptions = new Map<string, { email: string; name: string }>();

  getConfiguredWorkspaceUsers().forEach((item) => {
    attendeeOptions.set(item.email.toLowerCase(), {
      email: item.email,
      name: item.name
    });
  });

  knownProfiles.forEach((profile) => {
    attendeeOptions.set(profile.email.toLowerCase(), {
      email: profile.email,
      name: profile.nickname?.trim() || profile.fullName
    });
  });

  residents
    .filter((resident) => resident.email)
    .forEach((resident) => {
      attendeeOptions.set(resident.email!.toLowerCase(), {
        email: resident.email!,
        name: resident.name
      });
    });

  if (user?.email) {
    attendeeOptions.set(user.email.toLowerCase(), {
      email: user.email,
      name: user.name
    });
  }

  return (
    <MeetingSchedulerConsole
      attendeeOptions={Array.from(attendeeOptions.values())}
      connectedCalendarAccount={settings.googleCalendar.connectedAccount}
      calendarName={settings.googleCalendar.calendarName}
      calendarEnabled={settings.googleCalendar.enabled}
    />
  );
}
