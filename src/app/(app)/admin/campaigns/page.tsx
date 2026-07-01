import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getDailyCampaignAdminView } from "@/lib/campaigns/campaign-service";
import { getTodayDateKey } from "@/lib/dates";
import { CampaignManager } from "./campaign-manager";

export default async function CampaignsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.role !== "TEAM_LEAD" || !session.teamId) redirect("/dashboard");

  const dateKey = getTodayDateKey();
  const data = await getDailyCampaignAdminView(session, dateKey);

  return <CampaignManager data={data} />;
}
