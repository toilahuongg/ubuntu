import { describe, expect, it } from "vitest";

import {
  CAMPAIGN_TARGET_ROLES,
  isCampaignRole,
} from "@/lib/campaigns/constants";

describe("campaign constants", () => {
  it("uses the approved campaign roles", () => {
    expect(CAMPAIGN_TARGET_ROLES).toEqual([
      "NGV",
      "REGIONAL_LEAD",
      "ZONE_LEAD",
      "TEAM_LEAD",
    ]);
  });

  it("recognizes only campaign roles", () => {
    expect(isCampaignRole("NGV")).toBe(true);
    expect(isCampaignRole("REGIONAL_LEAD")).toBe(true);
    expect(isCampaignRole("ZONE_LEAD")).toBe(true);
    expect(isCampaignRole("TEAM_LEAD")).toBe(true);
    expect(isCampaignRole("MEMBER")).toBe(false);
    expect(isCampaignRole("ADMIN")).toBe(false);
  });
});
