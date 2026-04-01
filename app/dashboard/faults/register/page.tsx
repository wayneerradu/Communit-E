import { FaultRegisterConsole } from "@/components/faults/fault-register-console";
import { getSessionUser } from "@/lib/auth";
import { getFaultsData, getResidentsData } from "@/lib/hub-data";

type QueueView = "all-open" | "my-faults" | "priority" | "status" | "sla-breach" | "age" | "last-update";

function parseQueueView(value?: string): QueueView | undefined {
  const allowed: QueueView[] = ["all-open", "my-faults", "priority", "status", "sla-breach", "age", "last-update"];
  if (value && allowed.includes(value as QueueView)) {
    return value as QueueView;
  }
  return undefined;
}

export default async function FaultRegisterPage({
  searchParams
}: {
  searchParams?: Promise<{ focusFault?: string; queueView?: string; queueFilter?: string }>;
}) {
  const { faults } = getFaultsData();
  const { residents } = await getResidentsData();
  const user = await getSessionUser();
  const params = (await searchParams) ?? {};
  const initialQueueView = parseQueueView(params.queueView);
  const initialQueueFilter = params.queueFilter?.trim() ? params.queueFilter.trim() : undefined;
  const initialSelectedFaultId = params.focusFault?.trim() ? params.focusFault.trim() : undefined;

  return (
    <FaultRegisterConsole
      initialFaults={faults}
      residents={residents}
      currentUser={user}
      initialQueueView={initialQueueView}
      initialQueueFilter={initialQueueFilter}
      initialSelectedFaultId={initialSelectedFaultId}
    />
  );
}
