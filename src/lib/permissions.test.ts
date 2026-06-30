import { describe, expect, it } from "vitest";

import {
  canCreateInteraction,
  canManageCustomer,
  canManageTasks,
  canPersonalizeTasks,
  canProxySubmit,
  canViewCustomer,
} from "@/lib/permissions";

describe("canProxySubmit", () => {
  it("lets team leads submit for all users in their team", () => {
    expect(
      canProxySubmit(
        {
          fullName: "Lead",
          id: "lead",
          role: "TEAM_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
        },
        {
          fullName: "Regional",
          id: "regional",
          regionId: "region-a",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
      ),
    ).toBe(true);
  });

  it("rejects team leads without a team scope (fail-closed)", () => {
    expect(
      canProxySubmit(
        {
          fullName: "Unscoped Lead",
          id: "lead",
          role: "TEAM_LEAD",
          status: "ACTIVE",
        },
        {
          fullName: "Someone",
          id: "someone",
          role: "MEMBER",
          status: "ACTIVE",
          teamId: "team-x",
        },
      ),
    ).toBe(false);
  });

  it("lets zone leads submit for members and regional leads in their zone", () => {
    const actor = {
      fullName: "Zone",
      id: "zone-lead",
      role: "ZONE_LEAD" as const,
      status: "ACTIVE" as const,
      teamId: "team-a",
      zoneId: "zone-a",
    };

    expect(
      canProxySubmit(actor, {
        fullName: "Member",
        id: "m",
        regionId: "region-a",
        role: "MEMBER",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);

    expect(
      canProxySubmit(actor, {
        fullName: "NGV",
        id: "ngv",
        regionId: "region-a",
        role: "NGV",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);

    expect(
      canProxySubmit(actor, {
        fullName: "Regional",
        id: "r",
        regionId: "region-a",
        role: "REGIONAL_LEAD",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(true);

    // not another zone lead
    expect(
      canProxySubmit(actor, {
        fullName: "Other Zone",
        id: "z2",
        role: "ZONE_LEAD",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(false);

    // not a member in another zone
    expect(
      canProxySubmit(actor, {
        fullName: "Other Member",
        id: "m2",
        regionId: "region-b",
        role: "MEMBER",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-b",
      }),
    ).toBe(false);
  });

  it("lets regional leads submit only for members in their region", () => {
    expect(
      canProxySubmit(
        {
          fullName: "Regional",
          id: "regional",
          regionId: "region-a",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
        {
          fullName: "Member",
          id: "member",
          regionId: "region-a",
          role: "MEMBER",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
      ),
    ).toBe(true);

    expect(
      canProxySubmit(
        {
          fullName: "Regional",
          id: "regional",
          regionId: "region-a",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
        {
          fullName: "NGV",
          id: "ngv",
          regionId: "region-a",
          role: "NGV",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
      ),
    ).toBe(true);

    expect(
      canProxySubmit(
        {
          fullName: "Regional",
          id: "regional",
          regionId: "region-a",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
        {
          fullName: "Another lead",
          id: "lead-b",
          regionId: "region-a",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
      ),
    ).toBe(false);
  });

  it("does not let NGV proxy-submit for other users", () => {
    expect(
      canProxySubmit(
        {
          fullName: "NGV",
          id: "ngv",
          regionId: "region-a",
          role: "NGV",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
        {
          fullName: "Member",
          id: "member",
          regionId: "region-a",
          role: "MEMBER",
          status: "ACTIVE",
          teamId: "team-a",
          zoneId: "zone-a",
        },
      ),
    ).toBe(false);
  });
});

describe("canManageTasks", () => {
  it("allows admin and scoped team leads", () => {
    expect(
      canManageTasks({
        fullName: "Admin",
        id: "admin",
        role: "ADMIN",
        status: "ACTIVE",
      }),
    ).toBe(true);

    expect(
      canManageTasks({
        fullName: "Team lead",
        id: "team-lead",
        role: "TEAM_LEAD",
        status: "ACTIVE",
        teamId: "team-a",
      }),
    ).toBe(true);

    expect(
      canManageTasks({
        fullName: "Regional lead",
        id: "regional-lead",
        role: "REGIONAL_LEAD",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-a",
        regionId: "region-a",
      }),
    ).toBe(false);
  });

  it("rejects zone leads, unscoped leads, and regular roles", () => {
    expect(
      canManageTasks({
        fullName: "Zone lead",
        id: "zone-lead",
        role: "ZONE_LEAD",
        status: "ACTIVE",
        teamId: "team-a",
        zoneId: "zone-a",
      }),
    ).toBe(false);

    expect(
      canManageTasks({
        fullName: "Unscoped team lead",
        id: "team-lead",
        role: "TEAM_LEAD",
        status: "ACTIVE",
      }),
    ).toBe(false);

    expect(
      canManageTasks({
        fullName: "Unscoped zone lead",
        id: "zone-lead",
        role: "ZONE_LEAD",
        status: "ACTIVE",
        teamId: "team-a",
      }),
    ).toBe(false);

    expect(
      canManageTasks({
        fullName: "Member",
        id: "member",
        role: "MEMBER",
        status: "ACTIVE",
        teamId: "team-a",
      }),
    ).toBe(false);
  });
});

describe("canPersonalizeTasks", () => {
  const subject = {
    fullName: "Member",
    id: "member",
    role: "MEMBER" as const,
    status: "ACTIVE" as const,
    teamId: "team-a",
    zoneId: "zone-a",
    regionId: "region-a",
  };

  it("allows admin, team lead (same team), and zone lead (same zone)", () => {
    expect(
      canPersonalizeTasks(
        {
          fullName: "Admin",
          id: "admin",
          role: "ADMIN",
          status: "ACTIVE",
        },
        subject,
      ),
    ).toBe(true);

    expect(
      canPersonalizeTasks(
        {
          fullName: "Team Lead",
          id: "team-lead",
          role: "TEAM_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
        },
        subject,
      ),
    ).toBe(true);

    expect(
      canPersonalizeTasks(
        {
          fullName: "Zone Lead",
          id: "zone-lead",
          role: "ZONE_LEAD",
          status: "ACTIVE",
          zoneId: "zone-a",
        },
        subject,
      ),
    ).toBe(true);
  });

  it("denies regional leads and leads from other scopes", () => {
    expect(
      canPersonalizeTasks(
        {
          fullName: "Regional Lead",
          id: "regional-lead",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          regionId: "region-a",
        },
        subject,
      ),
    ).toBe(false);

    expect(
      canPersonalizeTasks(
        {
          fullName: "Other Team Lead",
          id: "team-lead-other",
          role: "TEAM_LEAD",
          status: "ACTIVE",
          teamId: "team-b",
        },
        subject,
      ),
    ).toBe(false);

    expect(
      canPersonalizeTasks(
        {
          fullName: "Other Zone Lead",
          id: "zone-lead-other",
          role: "ZONE_LEAD",
          status: "ACTIVE",
          zoneId: "zone-b",
        },
        subject,
      ),
    ).toBe(false);
  });
});

describe("canViewCustomer", () => {
  const customer = {
    caregiverIds: ["caregiver-1"],
    regionId: "region-a",
    teamId: "team-a",
    zoneId: "zone-a",
  };

  it("allows admin to view any customer", () => {
    expect(
      canViewCustomer(
        { fullName: "Admin", id: "admin", role: "ADMIN", status: "ACTIVE" },
        customer,
      ),
    ).toBe(true);
  });

  it("allows team lead to view customers in their team", () => {
    expect(
      canViewCustomer(
        {
          fullName: "Lead",
          id: "lead",
          role: "TEAM_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
        },
        customer,
      ),
    ).toBe(true);

    expect(
      canViewCustomer(
        {
          fullName: "Lead",
          id: "lead",
          role: "TEAM_LEAD",
          status: "ACTIVE",
          teamId: "team-b",
        },
        customer,
      ),
    ).toBe(false);
  });

  it("allows caregiver to view their assigned customers", () => {
    expect(
      canViewCustomer(
        {
          fullName: "Caregiver",
          id: "caregiver-1",
          role: "MEMBER",
          status: "ACTIVE",
        },
        customer,
      ),
    ).toBe(true);

    expect(
      canViewCustomer(
        {
          fullName: "Other",
          id: "caregiver-2",
          role: "MEMBER",
          status: "ACTIVE",
        },
        customer,
      ),
    ).toBe(false);
  });
});

describe("canManageCustomer", () => {
  const customer = {
    caregiverIds: ["caregiver-1"],
    regionId: "region-a",
    teamId: "team-a",
    zoneId: "zone-a",
  };

  it("allows admin to manage any customer", () => {
    expect(
      canManageCustomer(
        { fullName: "Admin", id: "admin", role: "ADMIN", status: "ACTIVE" },
        customer,
      ),
    ).toBe(true);
  });

  it("allows scoped leads to manage customers in scope", () => {
    expect(
      canManageCustomer(
        {
          fullName: "Lead",
          id: "lead",
          role: "TEAM_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
        },
        customer,
      ),
    ).toBe(true);

    expect(
      canManageCustomer(
        {
          fullName: "Lead",
          id: "lead",
          role: "TEAM_LEAD",
          status: "ACTIVE",
          teamId: "team-b",
        },
        customer,
      ),
    ).toBe(false);
  });

  it("allows caregiver to manage their assigned customers", () => {
    expect(
      canManageCustomer(
        {
          fullName: "Caregiver",
          id: "caregiver-1",
          role: "MEMBER",
          status: "ACTIVE",
        },
        customer,
      ),
    ).toBe(true);
  });

  it("allows any member to create customers (no customer arg)", () => {
    expect(
      canManageCustomer({
        fullName: "Member",
        id: "member",
        role: "MEMBER",
        status: "ACTIVE",
      }),
    ).toBe(true);

    expect(
      canManageCustomer({
        fullName: "NGV",
        id: "ngv",
        role: "NGV",
        status: "ACTIVE",
      }),
    ).toBe(true);
  });

  it("allows any signed-in role to create customers", () => {
    expect(
      canManageCustomer({
        fullName: "Lead",
        id: "lead",
        role: "TEAM_LEAD",
        status: "ACTIVE",
      }),
    ).toBe(true);

    expect(
      canManageCustomer({
        fullName: "Zone lead",
        id: "zone-lead",
        role: "ZONE_LEAD",
        status: "ACTIVE",
      }),
    ).toBe(true);

    expect(
      canManageCustomer({
        fullName: "Regional lead",
        id: "regional-lead",
        role: "REGIONAL_LEAD",
        status: "ACTIVE",
      }),
    ).toBe(true);
  });
});

describe("canCreateInteraction", () => {
  const customer = {
    caregiverIds: ["caregiver-1"],
    regionId: "region-a",
    teamId: "team-a",
    zoneId: "zone-a",
  };

  it("allows caregiver to create interactions", () => {
    expect(
      canCreateInteraction(
        {
          fullName: "Caregiver",
          id: "caregiver-1",
          role: "MEMBER",
          status: "ACTIVE",
        },
        customer,
      ),
    ).toBe(true);
  });

  it("allows admin and scoped leads", () => {
    expect(
      canCreateInteraction(
        { fullName: "Admin", id: "admin", role: "ADMIN", status: "ACTIVE" },
        customer,
      ),
    ).toBe(true);

    expect(
      canCreateInteraction(
        {
          fullName: "Lead",
          id: "lead",
          role: "TEAM_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
        },
        customer,
      ),
    ).toBe(true);
  });

  it("rejects non-caregiver members", () => {
    expect(
      canCreateInteraction(
        {
          fullName: "Other",
          id: "caregiver-2",
          role: "MEMBER",
          status: "ACTIVE",
        },
        customer,
      ),
    ).toBe(false);
  });
});
