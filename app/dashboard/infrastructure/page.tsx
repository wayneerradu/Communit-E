import { getSessionUser } from "@/lib/auth";
import { InfrastructureConsole } from "@/components/infrastructure/infrastructure-console";
import { getInfrastructureData } from "@/lib/hub-data";

export default async function InfrastructurePage() {
  const { assets } = getInfrastructureData();
  await getSessionUser();

  return <InfrastructureConsole initialAssets={assets} />;
}
