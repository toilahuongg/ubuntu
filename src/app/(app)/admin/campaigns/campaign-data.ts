import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import {
  getDailyCampaignAdminView,
  listDailyCampaignsForTeam,
  resolveCampaignReportDate,
} from "@/lib/campaigns/campaign-service";
import { getTodayDateKey } from "@/lib/dates";

export async function requireCampaignAdminSession() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.role !== "TEAM_LEAD" || !session.teamId) redirect("/dashboard");

  return session;
}

export async function getCurrentDailyCampaignAdminView() {
  const session = await requireCampaignAdminSession();

  return getDailyCampaignAdminView(session, getTodayDateKey());
}

export async function getCampaignReportAdminView(requestedDate?: string) {
  const session = await requireCampaignAdminSession();
  const todayDate = getTodayDateKey();
  const campaigns = await listDailyCampaignsForTeam(session);
  const selectedDate = resolveCampaignReportDate({
    availableDates: campaigns.map((campaign) => campaign.date),
    requestedDate,
    todayDate,
  });
  const data = await getDailyCampaignAdminView(session, selectedDate);

  return { campaigns, data, selectedDate, todayDate };
}
