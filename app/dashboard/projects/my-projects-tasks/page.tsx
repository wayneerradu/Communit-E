import { getSessionUser } from "@/lib/auth";
import { ProjectsConsole } from "@/components/projects/projects-console";
import { getProjectsData } from "@/lib/hub-data";
import { getConfiguredWorkspaceUsers } from "@/lib/identity";

export default async function MyProjectsTasksPage({
  searchParams
}: {
  searchParams: Promise<{ focus?: string; queue?: string; action?: string; context?: string }>;
}) {
  const { projects, parkingLotIdeas } = getProjectsData();
  const currentUser = await getSessionUser();
  const configuredUsers = getConfiguredWorkspaceUsers();
  const projectAdmins = configuredUsers.filter((user) => user.role === "ADMIN" || user.role === "SUPER_ADMIN");
  const { focus, queue, action, context } = await searchParams;

  return (
    <ProjectsConsole
      initialProjects={projects}
      parkingLotIdeas={parkingLotIdeas}
      currentUser={currentUser}
      projectAdmins={projectAdmins}
      mode="my"
      heading="My Projects And Tasks"
      description="Work your owned projects and assigned tasks from one focused queue and workspace."
      focusProjectId={focus}
      focusQueue={queue}
      focusAction={action}
      contextMessage={context}
    />
  );
}
