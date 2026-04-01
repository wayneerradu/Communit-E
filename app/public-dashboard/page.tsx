import { PublicDashboardConsole } from "@/components/public/public-dashboard-console";
import { listPublicFaults } from "@/lib/public-faults";

export const dynamic = "force-dynamic";

export default function PublicDashboardPage() {
  return <PublicDashboardConsole faults={listPublicFaults()} />;
}
