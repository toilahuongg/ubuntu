import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getTodayDateKey } from "@/lib/dates";
import { listRecentActivities } from "@/lib/tasks/activity-service";
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

  if (session.role === "MEMBER" || session.role === "NGV" || session.role === "TDM") {
    const [data, activities] = await Promise.all([
      buildMemberDashboard(session, dateKey),
      listRecentActivities(session, 10),
    ]);
    return (
      <MemberDashboard
        data={data}
        activities={activities}
        userId={session.id}
      />
    );
  }

  const [data, activities] = await Promise.all([
    buildLeaderDashboard(session, dateKey),
    listRecentActivities(session, 10),
  ]);
  return (
    <LeaderDashboard
      data={data}
      activities={activities}
      userId={session.id}
    />
  );
}
