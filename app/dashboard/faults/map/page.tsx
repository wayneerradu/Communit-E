import { FaultMapConsole } from "@/components/faults/fault-map-console";
import { getFaultsData, getSuperAdminData } from "@/lib/hub-data";

export default async function FaultMapPage() {
  const { faults } = getFaultsData();
  const { settings } = await getSuperAdminData();

  return (
    <FaultMapConsole
      faults={faults}
      googleMapsApiKey={settings.googleWorkspace.googleMapsApiKey}
      defaultCenter={settings.googleWorkspace.residentsMapDefaultCenter}
    />
  );
}
