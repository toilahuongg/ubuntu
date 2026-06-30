import { describe, expect, it } from "vitest";

import type { AdminOperationsView } from "@/lib/services/admin-operations-types";

import {
  filterMembersForSelection,
  getActiveSummary,
  normalizeSelection,
} from "./operations-dashboard.helpers";

const view: AdminOperationsView = {
  dateKey: "2026-04-22",
  members: [
    {
      completionDays: [],
      fullName: "Member A1",
      id: "member-a1",
      regionId: "region-a1",
      role: "MEMBER",
      roleLabel: "Thành viên",
      status: "needs_attention",
      summary: {
        assigned: 31,
        completed: 3,
        pending: 28,
        completionPercent: 10,
      },
      teamId: "team-a",
      zoneId: "zone-a1",
      taskProgresses: [],
    },
    {
      completionDays: [],
      fullName: "Member A2",
      id: "member-a2",
      regionId: "region-a2",
      role: "MEMBER",
      roleLabel: "Thành viên",
      status: "in_progress",
      summary: {
        assigned: 10,
        completed: 5,
        pending: 5,
        completionPercent: 50,
      },
      teamId: "team-a",
      zoneId: "zone-a2",
      taskProgresses: [],
    },
  ],
  scope: {
    memberCount: 2,
    name: "Nhóm A",
    role: "TEAM_LEAD",
    roleLabel: "CS - ĐL",
  },
  selectionDefaults: {
    teamId: "team-a",
    zoneId: null,
    regionId: null,
  },
  summary: {
    assigned: 41,
    completed: 8,
    pending: 33,
    completionPercent: 20,
  },
  tasks: [],
  tree: {
    teams: [
      {
        id: "team-a",
        memberCount: 2,
        name: "Nhóm A",
        summary: {
          assigned: 41,
          completed: 8,
          pending: 33,
          completionPercent: 20,
        },
        zones: [
          {
            id: "zone-a1",
            memberCount: 1,
            name: "ĐV A1",
            regions: [
              {
                id: "region-a1",
                memberCount: 1,
                name: "KV A1",
                summary: {
                  assigned: 31,
                  completed: 3,
                  pending: 28,
                  completionPercent: 10,
                },
                teamId: "team-a",
                zoneId: "zone-a1",
              },
            ],
            summary: {
              assigned: 31,
              completed: 3,
              pending: 28,
              completionPercent: 10,
            },
            teamId: "team-a",
          },
          {
            id: "zone-a2",
            memberCount: 1,
            name: "ĐV A2",
            regions: [
              {
                id: "region-a2",
                memberCount: 1,
                name: "KV A2",
                summary: {
                  assigned: 10,
                  completed: 5,
                  pending: 5,
                  completionPercent: 50,
                },
                teamId: "team-a",
                zoneId: "zone-a2",
              },
            ],
            summary: {
              assigned: 10,
              completed: 5,
              pending: 5,
              completionPercent: 50,
            },
            teamId: "team-a",
          },
        ],
      },
    ],
  },
};

describe("operations dashboard helpers", () => {
  it("resolves the deepest selected summary", () => {
    expect(
      getActiveSummary(view, {
        teamId: "team-a",
        zoneId: "zone-a1",
        regionId: "region-a1",
      }),
    ).toEqual({
      assigned: 31,
      completed: 3,
      pending: 28,
      completionPercent: 10,
    });
  });

  it("filters members by the selected branch", () => {
    expect(
      filterMembersForSelection(view, {
        teamId: "team-a",
        zoneId: "zone-a2",
        regionId: null,
      }).map((member) => member.id),
    ).toEqual(["member-a2"]);
  });

  it("drops invalid child selections when the parent changes", () => {
    expect(
      normalizeSelection(view, {
        teamId: "team-a",
        zoneId: "zone-a2",
        regionId: "region-a1",
      }),
    ).toEqual({
      teamId: "team-a",
      zoneId: "zone-a2",
      regionId: null,
    });
  });
});
