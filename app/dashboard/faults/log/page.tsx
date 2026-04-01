import { FaultLogConsole } from "@/components/faults/fault-log-console";
import { getSessionUser } from "@/lib/auth";
import { getFaultsData, getResidentsData } from "@/lib/hub-data";

export default async function FaultLogPage() {
  const currentUser = await getSessionUser();
  const { faults } = getFaultsData();
  const { residents } = await getResidentsData();

  return <FaultLogConsole initialFaults={faults} residents={residents} currentUser={currentUser} />;
}
