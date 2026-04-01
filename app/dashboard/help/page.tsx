import { getHelpData } from "@/lib/hub-data";
import { HelpCenterConsole } from "@/components/help/help-center-console";
import { getSessionUser } from "@/lib/auth";

export default async function HelpPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const { articles } = getHelpData(category);
  const currentUser = await getSessionUser();

  return <HelpCenterConsole articles={articles} currentUser={currentUser} initialCategory={category} initialQuery={q} />;
}
