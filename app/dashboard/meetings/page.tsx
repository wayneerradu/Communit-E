import { MeetingsConsole } from "@/components/meetings/meetings-console";
import { getMeetingsData } from "@/lib/hub-data";

export default async function MeetingsPage({
  searchParams
}: {
  searchParams: Promise<{ focus?: string; action?: string; context?: string }>;
}) {
  const { minutes } = getMeetingsData();
  const { focus, action, context } = await searchParams;

  return (
    <MeetingsConsole
      initialMinutes={minutes}
      focusMinuteId={focus}
      focusAction={action}
      contextMessage={context}
    />
  );
}
