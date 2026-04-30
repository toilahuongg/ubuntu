import { redirect } from "react-router";
import { getSessionUser } from "@/lib/auth/session";
import { getTodayDateKey } from "@/lib/dates";
import { MEMBER_LIKE_ROLES, type Role } from "@/lib/domain";
import { listRecentActivities } from "@/lib/tasks/activity-service";
import {
  buildLeaderDashboard,
  buildMemberDashboard,
} from "@/lib/tasks/dashboard-service";
import { LeaderDashboard } from "app/(app)/dashboard/leader-dashboard";
import { MemberDashboard } from "app/(app)/dashboard/member-dashboard";

export async function ServerComponent() {
  const session = await getSessionUser();
  if (!session) throw redirect("/login");

  const dateKey = getTodayDateKey();

  if ((MEMBER_LIKE_ROLES as readonly Role[]).includes(session.role)) {
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
