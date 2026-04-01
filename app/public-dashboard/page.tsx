import { PublicDashboardConsole } from "@/components/public/public-dashboard-console";
import { readFaultsStore } from "@/lib/fault-store";

export const dynamic = "force-dynamic";

type PublicFault = {
  id: string;
  title: string;
  ethekwiniReference?: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "escalated" | "in-progress" | "closed" | "archived";
  locationText: string;
  createdAt?: string;
  escalatedAt?: string;
  firstInProgressAt?: string;
  closedAt?: string;
  updatedAt?: string;
};

export default function PublicDashboardPage() {
  const faults = readFaultsStore();
  const publicFaults: PublicFault[] = faults.map((fault) => ({
    id: fault.id,
    title: fault.title,
    ethekwiniReference: fault.ethekwiniReference,
    category: fault.category,
    priority: fault.priority,
    status: fault.status,
    locationText: fault.locationText,
    createdAt: fault.createdAt,
    escalatedAt: fault.escalatedAt,
    firstInProgressAt: fault.firstInProgressAt,
    closedAt: fault.closedAt,
    updatedAt: fault.updatedAt
  }));

  return <PublicDashboardConsole faults={publicFaults} />;
}
