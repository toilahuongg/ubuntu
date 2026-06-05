import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import type { SessionUser, SerializedUser } from "@/lib/domain";
import type { SubmissionRecordModel, TaskRecord } from "@/lib/models";
import {
  buildAdminOperationsViewModel,
  getAdminOperationsMonthDateKeys,
} from "@/lib/services/admin-operations-service";

function objectId(seed: string) {
  if (/^[0-9a-f]{24}$/i.test(seed)) {
    return new Types.ObjectId(seed);
  }

  const hex = Array.from(seed)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24)
    .padEnd(24, "0");
  return new Types.ObjectId(hex);
}

function createUser(input: {
  fullName: string;
  id: string;
  regionId?: string | null;
  role?: SerializedUser["role"];
  teamId?: string | null;
  zoneId?: string | null;
}) {
  return {
    fullName: input.fullName,
    id: input.id,
    regionId: input.regionId ?? null,
    role: input.role ?? "MEMBER",
    status: "ACTIVE",
    teamId: input.teamId ?? null,
    zoneId: input.zoneId ?? null,
  } satisfies SerializedUser;
}

function createTask(input: {
  deadlineTime?: string;
  id: string;
  regionId?: string | null;
  scheduledMonthDays?: number[] | null;
  scheduleType?: TaskRecord["scheduleType"];
  scope: TaskRecord["scope"];
  targetRoles?: TaskRecord["targetRoles"];
  teamId: string;
  zoneId?: string | null;
}) {
  return {
    _id: objectId(input.id),
    completedAt: null,
    completionMessage: "",
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    createdBy: objectId("createdby"),
    deadlineTime: input.deadlineTime ?? "09:00",
    description: "",
    expReward: 0,
    isActive: true,
    lateWindowDays: 1,
    pointReward: 0,
    regionId: input.regionId ? objectId(input.regionId) : null,
    scope: input.scope,
    scheduleType: input.scheduleType ?? "EVERY_DAY",
    scheduledMonthDays: input.scheduledMonthDays ?? [],
    scheduledWeekdays: [],
    sortOrder: null,
    submissionMessage: "",
    targetCount: null,
    targetRoles: input.targetRoles ?? ["MEMBER"],
    taskType: "DAILY_PER_MEMBER",
    teamId: objectId(input.teamId),
    title: input.id,
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    zoneId: input.zoneId ? objectId(input.zoneId) : null,
  } satisfies TaskRecord;
}

function createSubmission(input: {
  date: string;
  id: string;
  subjectUserId: string;
  taskId: string;
}) {
  return {
    _id: objectId(input.id),
    actorUserId: objectId("actoruser"),
    completionCount: 1,
    createdAt: new Date(`${input.date}T10:00:00.000Z`),
    date: input.date,
    subjectUserId: objectId(input.subjectUserId),
    submittedAt: new Date(`${input.date}T10:00:00.000Z`),
    taskId: objectId(input.taskId),
    updatedAt: new Date(`${input.date}T10:00:00.000Z`),
  } satisfies SubmissionRecordModel;
}

const ids = {
  memberA1: "111111111111111111111111",
  memberA2: "222222222222222222222222",
  memberB1: "333333333333333333333333",
  regionA1: "444444444444444444444444",
  regionA2: "555555555555555555555555",
  regionB1: "666666666666666666666666",
  teamA: "777777777777777777777777",
  teamB: "888888888888888888888888",
  teamLeadA: "999999999999999999999999",
  zoneA1: "aaaaaaaaaaaaaaaaaaaaaaaa",
  zoneA2: "bbbbbbbbbbbbbbbbbbbbbbbb",
  zoneB1: "cccccccccccccccccccccccc",
};

const structure = {
  regions: [
    {
      code: "RA1",
      id: ids.regionA1,
      leadUserIds: [],
      memberCount: 0,
      name: "KV A1",
      teamId: ids.teamA,
      teamName: "Nhóm A",
      zoneId: ids.zoneA1,
      zoneName: "ĐV A1",
    },
    {
      code: "RA2",
      id: ids.regionA2,
      leadUserIds: [],
      memberCount: 0,
      name: "KV A2",
      teamId: ids.teamA,
      teamName: "Nhóm A",
      zoneId: ids.zoneA2,
      zoneName: "ĐV A2",
    },
    {
      code: "RB1",
      id: ids.regionB1,
      leadUserIds: [],
      memberCount: 0,
      name: "KV B1",
      teamId: ids.teamB,
      teamName: "Nhóm B",
      zoneId: ids.zoneB1,
      zoneName: "ĐV B1",
    },
  ],
  teams: [
    {
      code: "TA",
      id: ids.teamA,
      leadUserIds: [],
      memberCount: 0,
      name: "Nhóm A",
    },
    {
      code: "TB",
      id: ids.teamB,
      leadUserIds: [],
      memberCount: 0,
      name: "Nhóm B",
    },
  ],
  zones: [
    {
      code: "ZA1",
      id: ids.zoneA1,
      leadUserIds: [],
      memberCount: 0,
      name: "ĐV A1",
      regionCount: 1,
      teamId: ids.teamA,
      teamName: "Nhóm A",
    },
    {
      code: "ZA2",
      id: ids.zoneA2,
      leadUserIds: [],
      memberCount: 0,
      name: "ĐV A2",
      regionCount: 1,
      teamId: ids.teamA,
      teamName: "Nhóm A",
    },
    {
      code: "ZB1",
      id: ids.zoneB1,
      leadUserIds: [],
      memberCount: 0,
      name: "ĐV B1",
      regionCount: 1,
      teamId: ids.teamB,
      teamName: "Nhóm B",
    },
  ],
};

const users = {
  memberA1: createUser({
    fullName: "Member A1",
    id: ids.memberA1,
    regionId: ids.regionA1,
    teamId: ids.teamA,
    zoneId: ids.zoneA1,
  }),
  memberA2: createUser({
    fullName: "Member A2",
    id: ids.memberA2,
    regionId: ids.regionA2,
    teamId: ids.teamA,
    zoneId: ids.zoneA2,
  }),
  memberB1: createUser({
    fullName: "Member B1",
    id: ids.memberB1,
    regionId: ids.regionB1,
    teamId: ids.teamB,
    zoneId: ids.zoneB1,
  }),
  teamLeadA: createUser({
    fullName: "Leader A",
    id: ids.teamLeadA,
    role: "TEAM_LEAD",
    teamId: ids.teamA,
  }),
};

const tasks = [
  createTask({
    id: "team-daily-a",
    scope: "TEAM",
    targetRoles: ["MEMBER"],
    teamId: ids.teamA,
  }),
  createTask({
    id: "zone-a1-monthly",
    regionId: null,
    scheduleType: "MONTHLY",
    scheduledMonthDays: [22],
    scope: "ZONE",
    targetRoles: ["MEMBER"],
    teamId: ids.teamA,
    zoneId: ids.zoneA1,
  }),
  createTask({
    id: "region-a2-monthly",
    regionId: ids.regionA2,
    scheduleType: "MONTHLY",
    scheduledMonthDays: [22],
    scope: "REGION",
    targetRoles: ["MEMBER"],
    teamId: ids.teamA,
    zoneId: ids.zoneA2,
  }),
];

const submissions = [
  createSubmission({
    date: "2026-04-01",
    id: "sub-1",
    subjectUserId: ids.memberA1,
    taskId: "team-daily-a",
  }),
  createSubmission({
    date: "2026-04-02",
    id: "sub-2",
    subjectUserId: ids.memberA1,
    taskId: "team-daily-a",
  }),
  createSubmission({
    date: "2026-04-22",
    id: "sub-3",
    subjectUserId: ids.memberA1,
    taskId: "zone-a1-monthly",
  }),
];

describe("admin operations periods", () => {
  it("builds only the current month window", () => {
    const monthDates = getAdminOperationsMonthDateKeys("2026-04-22");

    expect(monthDates.at(0)).toBe("2026-04-01");
    expect(monthDates.at(-1)).toBe("2026-04-30");
    expect(monthDates).toHaveLength(30);
  });
});

describe("admin operations view model", () => {
  it("aggregates monthly progress into team, zone, region, and member summaries", () => {
    const actor: SessionUser = {
      ...users.teamLeadA,
      status: "ACTIVE",
    };
    const view = buildAdminOperationsViewModel({
      actor,
      dateKey: "2026-04-22",
      orgContext: {
        region: null,
        team: { code: "TA", id: ids.teamA, name: "Nhóm A" },
        zone: null,
      },
      structure,
      submissions,
      tasks,
      visibleUsers: [users.teamLeadA, users.memberA1, users.memberA2],
    });

    expect(view.summary).toEqual({
      assigned: 62,
      completed: 3,
      pending: 59,
      completionPercent: 5,
    });
    expect(view.dateKey).toBe("2026-04-22");
    expect(view.selectionDefaults).toEqual({
      teamId: ids.teamA,
      zoneId: null,
      regionId: null,
    });

    const [teamA] = view.tree.teams;
    expect(teamA.name).toBe("Nhóm A");
    expect(teamA.memberCount).toBe(3);
    expect(teamA.summary).toEqual(view.summary);

    const zoneA1 = teamA.zones.find((zone) => zone.id === ids.zoneA1);
    const zoneA2 = teamA.zones.find((zone) => zone.id === ids.zoneA2);
    expect(zoneA1?.summary).toEqual({
      assigned: 31,
      completed: 3,
      pending: 28,
      completionPercent: 10,
    });
    expect(zoneA2?.summary).toEqual({
      assigned: 31,
      completed: 0,
      pending: 31,
      completionPercent: 0,
    });

    const regionA1 = zoneA1?.regions.find((region) => region.id === ids.regionA1);
    const regionA2 = zoneA2?.regions.find((region) => region.id === ids.regionA2);
    expect(regionA1?.summary.completed).toBe(3);
    expect(regionA2?.summary.pending).toBe(31);

    expect(view.members.map((member) => member.fullName)).toEqual([
      "Member A2",
      "Member A1",
      "Leader A",
    ]);
    expect(view.members[0]?.status).toBe("needs_attention");
    expect(view.members[1]?.status).toBe("in_progress");
    expect(view.members[2]?.status).toBe("idle");

    const memberA1 = view.members.find((member) => member.id === ids.memberA1);
    const april22 = memberA1?.completionDays.find(
      (day) => day.date === "2026-04-22",
    );
    expect(memberA1?.completionDays).toHaveLength(30);
    expect(april22).toMatchObject({
      completionCount: 1,
      tasks: [
        {
          completionCount: 1,
          taskType: "DAILY_PER_MEMBER",
          title: "zone-a1-monthly",
        },
      ],
    });

    // Verify taskProgresses and tasks
    expect(view.tasks).toHaveLength(3);
    expect(view.tasks.map((t) => t.title)).toContain("team-daily-a");
    expect(view.tasks.map((t) => t.title)).toContain("zone-a1-monthly");
    expect(view.tasks.map((t) => t.title)).toContain("region-a2-monthly");

    expect(memberA1?.taskProgresses).toContainEqual({
      taskId: objectId("team-daily-a").toString(),
      assigned: 30,
      completed: 2,
    });
    expect(memberA1?.taskProgresses).toContainEqual({
      taskId: objectId("zone-a1-monthly").toString(),
      assigned: 1,
      completed: 1,
    });
    expect(memberA1?.taskProgresses).toHaveLength(2);
  });

  it("scopes default selections to the actor role", () => {
    const zoneLeadActor: SessionUser = {
      ...createUser({
        fullName: "Zone Lead",
        id: "zoneleada1",
        role: "ZONE_LEAD",
        teamId: ids.teamA,
        zoneId: ids.zoneA1,
      }),
      status: "ACTIVE",
    };
    const regionalLeadActor: SessionUser = {
      ...createUser({
        fullName: "Regional Lead",
        id: "regionalleada1",
        regionId: ids.regionA1,
        role: "REGIONAL_LEAD",
        teamId: ids.teamA,
        zoneId: ids.zoneA1,
      }),
      status: "ACTIVE",
    };

    const zoneView = buildAdminOperationsViewModel({
      actor: zoneLeadActor,
      dateKey: "2026-04-22",
      orgContext: {
        region: null,
        team: { code: "TA", id: ids.teamA, name: "Nhóm A" },
        zone: { code: "ZA1", id: ids.zoneA1, name: "ĐV A1" },
      },
      structure,
      submissions,
      tasks,
      visibleUsers: [users.memberA1],
    });
    const regionalView = buildAdminOperationsViewModel({
      actor: regionalLeadActor,
      dateKey: "2026-04-22",
      orgContext: {
        region: { code: "RA1", id: ids.regionA1, name: "KV A1" },
        team: { code: "TA", id: ids.teamA, name: "Nhóm A" },
        zone: { code: "ZA1", id: ids.zoneA1, name: "ĐV A1" },
      },
      structure,
      submissions,
      tasks,
      visibleUsers: [users.memberA1],
    });

    expect(zoneView.selectionDefaults).toEqual({
      teamId: ids.teamA,
      zoneId: ids.zoneA1,
      regionId: null,
    });
    expect(regionalView.selectionDefaults).toEqual({
      teamId: ids.teamA,
      zoneId: ids.zoneA1,
      regionId: ids.regionA1,
    });
  });

  it("keeps admin selection unlocked at the root scope", () => {
    const actor: SessionUser = {
      fullName: "Admin",
      id: "admin",
      role: "ADMIN",
      status: "ACTIVE",
    };

    const view = buildAdminOperationsViewModel({
      actor,
      dateKey: "2026-04-22",
      orgContext: {
        region: null,
        team: null,
        zone: null,
      },
      structure,
      submissions,
      tasks,
      visibleUsers: [users.memberA1, users.memberA2, users.memberB1],
    });

    expect(view.selectionDefaults).toEqual({
      teamId: null,
      zoneId: null,
      regionId: null,
    });
    expect(view.tree.teams).toHaveLength(2);
    expect(view.scope.name).toBe("Toàn hệ thống");
  });
});
