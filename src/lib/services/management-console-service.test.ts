import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import type { SessionUser, SerializedUser } from "@/lib/domain";
import type {
  MonthlyGoalRecord,
  SubmissionRecordModel,
  TaskRecord,
} from "@/lib/models";
import { buildManagementConsoleFromData } from "@/lib/services/management-console-service";

const ids = {
  team: new Types.ObjectId(),
  zone: new Types.ObjectId(),
  region: new Types.ObjectId(),
  teamLead: new Types.ObjectId(),
  zoneLead: new Types.ObjectId(),
  regionalLead: new Types.ObjectId(),
  memberA: new Types.ObjectId(),
  memberB: new Types.ObjectId(),
  teamTask: new Types.ObjectId(),
  zoneTask: new Types.ObjectId(),
  regionTask: new Types.ObjectId(),
  countTask: new Types.ObjectId(),
};

function user(input: Partial<SerializedUser> & Pick<SerializedUser, "id" | "role">): SerializedUser {
  return {
    fullName: input.fullName ?? "User",
    id: input.id,
    role: input.role,
    status: "ACTIVE",
    teamId: input.teamId ?? ids.team.toString(),
    zoneId: input.zoneId ?? ids.zone.toString(),
    regionId: input.regionId ?? ids.region.toString(),
  };
}

function task(input: Partial<TaskRecord> & Pick<TaskRecord, "_id" | "scope">): TaskRecord {
  return {
    _id: input._id,
    completedAt: null,
    completionMessage: "",
    createdAt: new Date("2026-04-01T00:00:00Z"),
    createdBy: ids.teamLead,
    deadlineTime: "18:00",
    description: "",
    expReward: 10,
    isActive: true,
    lateWindowDays: 7,
    pointReward: 10,
    regionId: input.scope === "REGION" ? ids.region : null,
    scope: input.scope,
    submissionMessage: "",
    targetCount: input.targetCount ?? null,
    targetRoles: input.targetRoles ?? ["MEMBER", "NGV"],
    taskType: input.taskType ?? "MONTHLY_PER_MEMBER",
    teamId: ids.team,
    title: input.title ?? `${input.scope} task`,
    updatedAt: new Date("2026-04-01T00:00:00Z"),
    zoneId:
      input.scope === "ZONE" || input.scope === "REGION" ? ids.zone : null,
  };
}

function submission(input: {
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  completionCount?: number;
  date?: string;
}): SubmissionRecordModel {
  return {
    _id: new Types.ObjectId(),
    actorUserId: input.userId,
    completionCount: input.completionCount ?? 1,
    createdAt: new Date("2026-04-20T09:00:00Z"),
    date: input.date ?? "2026-04-20",
    subjectUserId: input.userId,
    submittedAt: new Date("2026-04-20T09:00:00Z"),
    taskId: input.taskId,
    updatedAt: new Date("2026-04-20T09:00:00Z"),
  };
}

function goal(input: {
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  targetCount: number;
}): MonthlyGoalRecord {
  return {
    _id: new Types.ObjectId(),
    createdAt: new Date("2026-04-01T00:00:00Z"),
    taskId: input.taskId,
    targetCount: input.targetCount,
    updatedAt: new Date("2026-04-01T00:00:00Z"),
    userId: input.userId,
    yearMonth: "2026-04",
  };
}

function baseInput(actor: SessionUser) {
  const memberA = user({
    fullName: "A",
    id: ids.memberA.toString(),
    role: "MEMBER",
  });
  const memberB = user({
    fullName: "B",
    id: ids.memberB.toString(),
    role: "MEMBER",
  });

  return {
    actor,
    dateKey: "2026-04-20",
    mode: "SCOPE" as const,
    canViewManagedScope: true,
    orgContext: {
      region: { code: "R1", id: ids.region.toString(), name: "Khu vực 1" },
      team: { code: "T1", id: ids.team.toString(), name: "Nhóm 1" },
      zone: { code: "Z1", id: ids.zone.toString(), name: "Địa vực 1" },
    },
    orgLookup: {
      regions: new Map([
        [ids.region.toString(), { code: "R1", name: "Khu vực 1" }],
      ]),
      teams: new Map([[ids.team.toString(), { code: "T1", name: "Nhóm 1" }]]),
      zones: new Map([[ids.zone.toString(), { code: "Z1", name: "Địa vực 1" }]]),
    },
    visibleUsers: [memberA, memberB],
    trends: [],
    taskDistribution: [],
  };
}

describe("management console aggregation", () => {
  it("returns self-mode view for members and unscoped team leads", () => {
    const memberView = buildManagementConsoleFromData({
      ...baseInput(
        user({
          id: ids.memberA.toString(),
          role: "MEMBER",
        }),
      ),
      mode: "SELF",
      canViewManagedScope: false,
      monthSubmissions: [],
      monthlyGoals: [],
      tasks: [],
      todaySubmissions: [],
    });

    const unscopedLeadView = buildManagementConsoleFromData({
      ...baseInput({
        fullName: "Lead",
        id: ids.teamLead.toString(),
        role: "TEAM_LEAD",
        status: "ACTIVE",
      }),
      mode: "SELF",
      canViewManagedScope: false,
      monthSubmissions: [],
      monthlyGoals: [],
      tasks: [],
      todaySubmissions: [],
    });

    expect(memberView?.scope.kind).toBe("SELF");
    expect(memberView?.mode).toBe("SELF");
    expect(unscopedLeadView?.scope.kind).toBe("SELF");
    expect(unscopedLeadView?.mode).toBe("SELF");
  });

  it("keeps team leads on team-scope tasks and excludes count-total from monthly goals", () => {
    const teamLead = user({
      fullName: "Team Lead",
      id: ids.teamLead.toString(),
      role: "TEAM_LEAD",
      regionId: null,
      zoneId: null,
    });
    const teamMonthlyTask = task({ _id: ids.teamTask, scope: "TEAM" });
    const zoneMonthlyTask = task({ _id: ids.zoneTask, scope: "ZONE" });
    const countTotalTask = task({
      _id: ids.countTask,
      scope: "TEAM",
      targetCount: 100,
      taskType: "COUNT_TOTAL",
    });

    const view = buildManagementConsoleFromData({
      ...baseInput(teamLead),
      monthSubmissions: [
        submission({
          completionCount: 3,
          taskId: ids.teamTask,
          userId: ids.memberA,
        }),
        submission({
          completionCount: 5,
          taskId: ids.countTask,
          userId: ids.memberA,
        }),
      ],
      monthlyGoals: [
        goal({ taskId: ids.teamTask, targetCount: 10, userId: ids.memberA }),
      ],
      tasks: [teamMonthlyTask, zoneMonthlyTask, countTotalTask],
      todaySubmissions: [
        submission({ taskId: ids.teamTask, userId: ids.memberA }),
      ],
    });

    expect(view?.scope.kind).toBe("TEAM");
    expect(view?.tasks.map((entry) => entry.id)).toEqual([
      ids.teamTask.toString(),
      ids.countTask.toString(),
    ]);
    expect(view?.summary.monthlyGoalPairs).toBe(2);
    expect(view?.summary.monthlyGoalSet).toBe(1);
    expect(view?.summary.monthlyGoalMissing).toBe(1);
    expect(
      view?.tasks.find((entry) => entry.id === ids.countTask.toString())
        ?.monthlyGoalSupported,
    ).toBe(false);
  });

  it("lets admin, zone, and regional leads see their allowed parent scopes", () => {
    const tasks = [
      task({ _id: ids.teamTask, scope: "TEAM" }),
      task({ _id: ids.zoneTask, scope: "ZONE" }),
      task({ _id: ids.regionTask, scope: "REGION" }),
    ];

    const adminView = buildManagementConsoleFromData({
      ...baseInput(
        user({
          fullName: "Admin",
          id: ids.teamLead.toString(),
          role: "ADMIN",
          teamId: null,
          zoneId: null,
          regionId: null,
        }),
      ),
      monthSubmissions: [],
      monthlyGoals: [],
      tasks,
      todaySubmissions: [],
    });

    const zoneView = buildManagementConsoleFromData({
      ...baseInput(
        user({
          fullName: "Zone Lead",
          id: ids.zoneLead.toString(),
          role: "ZONE_LEAD",
          regionId: null,
        }),
      ),
      monthSubmissions: [],
      monthlyGoals: [],
      tasks,
      todaySubmissions: [],
    });

    const regionalView = buildManagementConsoleFromData({
      ...baseInput(
        user({
          fullName: "Regional Lead",
          id: ids.regionalLead.toString(),
          role: "REGIONAL_LEAD",
        }),
      ),
      monthSubmissions: [],
      monthlyGoals: [],
      tasks,
      todaySubmissions: [],
    });

    expect(new Set(adminView?.tasks.map((entry) => entry.scope))).toEqual(
      new Set(["TEAM", "ZONE", "REGION"]),
    );
    expect(adminView?.scope.title).toBe("Điều hành toàn hệ thống");
    expect(adminView?.scope.subtitle).toBe("Toàn bộ tổ chức");
    expect(adminView?.mode).toBe("SCOPE");
    expect(adminView?.canViewManagedScope).toBe(true);

    expect(zoneView?.tasks.map((entry) => entry.scope)).toEqual(["TEAM", "ZONE"]);
    expect(new Set(regionalView?.tasks.map((entry) => entry.scope))).toEqual(
      new Set(["TEAM", "ZONE", "REGION"]),
    );
  });
});
