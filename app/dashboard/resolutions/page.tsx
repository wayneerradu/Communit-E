import { ResolutionsConsole } from "@/components/resolutions/resolutions-console";
import { getResolutionsData } from "@/lib/hub-data";

export default async function ResolutionsPage({
  searchParams
}: {
  searchParams: Promise<{ focus?: string; action?: string; context?: string }>;
}) {
  const { resolutions } = getResolutionsData();
  const { focus, action, context } = await searchParams;

  return <ResolutionsConsole initialResolutions={resolutions} focusResolutionId={focus} focusAction={action} contextMessage={context} />;
}
