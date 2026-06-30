import { Building2, Layers, MapPin } from "lucide-react";

import type { SessionUser } from "@/lib/domain";

export type ScopedProgressItem = {
  href: string;
  icon: typeof Building2 | typeof Layers | typeof MapPin;
  label: string;
  description: string;
};

export function getScopedProgressItem(
  session: SessionUser,
): ScopedProgressItem | null {
  if (session.role === "TEAM_LEAD" && session.teamId) {
    return {
      href: `/admin/teams/${encodeURIComponent(session.teamId)}`,
      icon: Building2,
      label: "Tiến độ chi hội",
      description: "Xem tiến độ thành viên trong chi hội quản lý",
    };
  }

  if (session.role === "ZONE_LEAD" && session.zoneId) {
    return {
      href: `/admin/zones/${encodeURIComponent(session.zoneId)}`,
      icon: Layers,
      label: "Tiến độ địa vực",
      description: "Xem tiến độ thành viên trong địa vực quản lý",
    };
  }

  if (session.role === "REGIONAL_LEAD" && session.regionId) {
    return {
      href: `/admin/regions/${encodeURIComponent(session.regionId)}`,
      icon: MapPin,
      label: "Tiến độ khu vực",
      description: "Xem tiến độ thành viên trong khu vực quản lý",
    };
  }

  return null;
}
