import { getSessionUser } from "@/lib/auth";
import { FaultsConsole } from "@/components/faults/faults-console";
import { getFaultsData, getResidentsData } from "@/lib/hub-data";

export default async function FaultsPage({
  searchParams
}: {
  searchParams: Promise<{ focus?: string; queue?: string; action?: string; context?: string }>;
}) {
  const { faults, notes } = getFaultsData();
  const currentUser = await getSessionUser();
  const { residents } = await getResidentsData();
  const { focus, queue, action, context } = await searchParams;

  return (
    <FaultsConsole
      initialFaults={faults}
      initialNotes={notes}
      residents={residents}
      currentUser={currentUser}
      focusFaultId={focus}
      focusQueue={queue}
      focusAction={action}
      contextMessage={context}
    />
  );
}
