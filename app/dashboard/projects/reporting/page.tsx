import { ProjectsReportingConsole } from "@/components/projects/projects-reporting-console";
import { getProjectsData } from "@/lib/hub-data";

export default function ProjectsReportingPage() {
  const { projects } = getProjectsData();
  return <ProjectsReportingConsole projects={projects} />;
}
