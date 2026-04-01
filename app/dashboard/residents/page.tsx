import { ResidentsConsole } from "@/components/residents/residents-console";
import { getSessionUser } from "@/lib/auth";
import { getResidentsData } from "@/lib/hub-data";

export default async function ResidentsPage({
  searchParams
}: {
  searchParams: Promise<{ focus?: string; queue?: string; action?: string; context?: string }>;
}) {
  const user = await getSessionUser();
  const { residents, residentMapPins, history } = await getResidentsData();
  const { focus, queue, action, context } = await searchParams;

  return (
    <ResidentsConsole
      initialResidents={residents}
      initialHistory={history}
      residentMapCount={residentMapPins.length}
      currentUserRole={user?.role ?? "ADMIN"}
      currentUserName={user?.name ?? "Community Admin"}
      focusResidentId={focus}
      focusQueue={queue}
      focusAction={action}
      contextMessage={context}
    />
  );
}
