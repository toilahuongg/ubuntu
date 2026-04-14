import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getTodayDateKey } from "@/lib/dates";
import {
  buildLeaderDashboard,
  buildMemberDashboard,
} from "@/lib/tasks/dashboard-service";
import { LeaderDashboard } from "./leader-dashboard";
import { MemberDashboard } from "./member-dashboard";

export default async function DashboardPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const dateKey = getTodayDateKey();

  if (session.role === "MEMBER") {
    const data = await buildMemberDashboard(session, dateKey);
    return <MemberDashboard data={data} />;
  }

  const data = await buildLeaderDashboard(session, dateKey);
  return <LeaderDashboard data={data} />;
}
