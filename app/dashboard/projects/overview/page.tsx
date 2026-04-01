import { ProjectsOverviewConsole } from "@/components/projects/projects-overview-console";
import { getProjectsData } from "@/lib/hub-data";

export default function ProjectsOverviewPage() {
  const { projects } = getProjectsData();
  return <ProjectsOverviewConsole projects={projects} />;
}
