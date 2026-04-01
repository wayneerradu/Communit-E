import { ProConsole } from "@/components/pro/pro-console";
import { getSessionUser } from "@/lib/auth";
import { getProData } from "@/lib/hub-data";

export default async function ProDonorsPage() {
  const user = await getSessionUser();
  const { prComms, socialCalendar, internationalObservances, plannerEvents, eventCampaigns, wordpress, donors, donations } = await getProData();

  return (
    <ProConsole
      initialPRComms={prComms}
      socialCalendar={socialCalendar}
      internationalObservances={internationalObservances}
      plannerEvents={plannerEvents}
      eventCampaigns={eventCampaigns}
      wordpress={wordpress}
      donors={donors}
      donations={donations}
      currentUser={user ?? { id: "anonymous", name: "Anonymous", email: "", role: "PRO" }}
      mode="donors"
    />
  );
}
