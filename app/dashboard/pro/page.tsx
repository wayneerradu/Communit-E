import { ProConsole } from "@/components/pro/pro-console";
import { getSessionUser } from "@/lib/auth";
import { getProData } from "@/lib/hub-data";

export default async function ProPage({
  searchParams
}: {
  searchParams: Promise<{ focus?: string; queue?: string; action?: string; context?: string }>;
}) {
  const user = await getSessionUser();
  const { prComms, socialCalendar, internationalObservances, plannerEvents, eventCampaigns, donors, donations } = await getProData();
  const { focus, queue, action, context } = await searchParams;

  return (
    <ProConsole
      initialPRComms={prComms}
      socialCalendar={socialCalendar}
      internationalObservances={internationalObservances}
      plannerEvents={plannerEvents}
      eventCampaigns={eventCampaigns}
      donors={donors}
      donations={donations}
      currentUser={user ?? { id: "anonymous", name: "Anonymous", email: "", role: "PRO" }}
      mode="overview"
      focusPRId={focus}
      focusQueue={queue}
      focusAction={action}
      contextMessage={context}
    />
  );
}
