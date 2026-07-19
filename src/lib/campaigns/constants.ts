import type { Role, TaskTargetRole } from "@/lib/domain";

export const CAMPAIGN_TARGET_ROLES = [
  "NGV",
  "MEMBER",
  "TDM",
  "REGIONAL_LEAD",
  "ZONE_LEAD",
  "TEAM_LEAD",
] as const satisfies readonly TaskTargetRole[];

export type CampaignTargetRole = (typeof CAMPAIGN_TARGET_ROLES)[number];

export function isCampaignRole(role: Role): role is CampaignTargetRole {
  return (CAMPAIGN_TARGET_ROLES as readonly string[]).includes(role);
}
