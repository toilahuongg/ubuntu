import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { serializeEquipped } from "@/lib/cosmetics/serialize";
import { getTodayDateKey } from "@/lib/dates";
import { getEquippedPayloadsForUsers } from "@/lib/services/cosmetics-service";
import {
  buildLeaderPrayerDashboard,
  buildMemberPrayerDashboard,
} from "@/lib/tasks/dashboard-service";
import { PrayerDashboardClient } from "./prayer-dashboard-client";

export default async function PrayerPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const dateKey = getTodayDateKey();

  if (session.role === "MEMBER" || session.role === "NGV" || session.role === "TDM") {
    const [data, equippedMap] = await Promise.all([
      buildMemberPrayerDashboard(session, dateKey),
      getEquippedPayloadsForUsers([session.id]),
    ]);
    const equipped = equippedMap.get(session.id);
    return (
      <PrayerDashboardClient
        data={data}
        user={session}
        userId={session.id}
        equipped={equipped ? serializeEquipped(equipped) : null}
        isLeader={false}
      />
    );
  }

  const [data, equippedMap] = await Promise.all([
    buildLeaderPrayerDashboard(session, dateKey),
    getEquippedPayloadsForUsers([session.id]),
  ]);
  const equipped = equippedMap.get(session.id);
  return (
    <PrayerDashboardClient
      data={data}
      user={session}
      userId={session.id}
      equipped={equipped ? serializeEquipped(equipped) : null}
      isLeader={true}
    />
  );
}
