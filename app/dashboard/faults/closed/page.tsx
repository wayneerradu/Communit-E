import { FaultRegisterConsole } from "@/components/faults/fault-register-console";
import { getSessionUser } from "@/lib/auth";
import { getFaultsData, getResidentsData } from "@/lib/hub-data";

export default async function ClosedFaultsPage() {
  const { faults } = getFaultsData();
  const { residents } = await getResidentsData();
  const user = await getSessionUser();
  const closedFaults = faults.filter((fault) => fault.status === "closed" || fault.status === "archived");

  return (
    <FaultRegisterConsole
      initialFaults={closedFaults}
      residents={residents}
      currentUser={user}
      initialQueueView="status"
      initialQueueFilter="all"
      closedArchiveOnly
      headerTitle="Closed Fault Queue"
      headerDescription="Operational queue workspace for closed and archived faults, with full drilldown and reopen actions."
    />
  );
}
