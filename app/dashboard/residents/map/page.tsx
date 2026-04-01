import { ResidentsMapConsole } from "@/components/residents/residents-map-console";
import { getSessionUser } from "@/lib/auth";
import { getResidentsData, getSuperAdminData } from "@/lib/hub-data";

export default async function ResidentsMapPage() {
  const user = await getSessionUser();
  const { residents } = await getResidentsData();
  const { settings } = await getSuperAdminData();

  return (
    <ResidentsMapConsole
      residents={residents}
      currentUserName={user?.name ?? "Community Admin"}
      googleMapsApiKey={settings.googleWorkspace.googleMapsApiKey}
      defaultCenter={settings.googleWorkspace.residentsMapDefaultCenter}
    />
  );
}
