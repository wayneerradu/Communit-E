import { ParkingLotConsole } from "@/components/projects/parking-lot-console";
import { getProjectsData } from "@/lib/hub-data";

export default function ParkingLotPage() {
  const { parkingLotIdeas } = getProjectsData();

  return <ParkingLotConsole initialIdeas={parkingLotIdeas} />;
}
