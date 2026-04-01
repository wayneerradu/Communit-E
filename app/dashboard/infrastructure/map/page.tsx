import { InfrastructureMapConsole } from "@/components/infrastructure/infrastructure-map-console";
import { getInfrastructureData, getSuperAdminData } from "@/lib/hub-data";

export default async function InfrastructureMapPage() {
  const { assets } = getInfrastructureData();
  const { settings } = await getSuperAdminData();

  return (
    <InfrastructureMapConsole
      assets={assets}
      googleMapsApiKey={settings.googleWorkspace.googleMapsApiKey}
      defaultCenter={settings.googleWorkspace.residentsMapDefaultCenter}
    />
  );
}
