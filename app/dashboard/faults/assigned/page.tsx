import { FaultRegisterConsole } from "@/components/faults/fault-register-console";
import { getSessionUser } from "@/lib/auth";
import { getFaultsData, getResidentsData } from "@/lib/hub-data";

export default async function AssignedFaultsPage() {
  const { faults } = getFaultsData();
  const { residents } = await getResidentsData();
  const user = await getSessionUser();

  return (
    <FaultRegisterConsole
      initialFaults={faults}
      residents={residents}
      currentUser={user}
      initialQueueView="my-faults"
      initialQueueFilter="all"
      lockToMyFaults
      headerTitle="Assigned to Me"
      headerDescription="Your personal fault queue with live editing, escalation actions, and closure workflow."
    />
  );
}
