import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import type { SessionUser } from "@/lib/domain";
import type { TaskRecord } from "@/lib/models";
import {
  filterManageableTasksForActor,
  mapTask,
  normalizeTaskExternalLink,
} from "@/lib/tasks/task-service";

function makeTask(
  input: Partial<TaskRecord> &
    Pick<TaskRecord, "_id" | "scope" | "teamId" | "title">,
): TaskRecord {
  return {
    _id: input._id,
    completedAt: null,
    completionMessage: "",
    createdAt: input.createdAt ?? new Date("2026-04-01T00:00:00.000Z"),
    createdBy: new Types.ObjectId(),
    deadlineTime: input.deadlineTime ?? "21:00",
    description: "",
    externalLabel: input.externalLabel,
    externalUrl: input.externalUrl,
    expReward: 10,
    isActive: true,
    lateWindowDays: 7,
    pointReward: 10,
    regionId: input.regionId ?? null,
    scope: input.scope,
    sortOrder: input.sortOrder ?? null,
    submissionMessage: "",
    targetCount: null,
    targetRoles: ["MEMBER"],
    taskType: "DAILY_PER_MEMBER",
    teamId: input.teamId,
    title: input.title,
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    zoneId: input.zoneId ?? null,
  };
}

describe("filterManageableTasksForActor", () => {
  it("excludes team-scoped tasks for a zone lead", () => {
    const teamId = new Types.ObjectId().toString();
    const zoneId = new Types.ObjectId().toString();
    const regionId = new Types.ObjectId().toString();
    const actor: SessionUser = {
      fullName: "Zone lead",
      id: "zone-lead",
      regionId,
      role: "ZONE_LEAD",
      status: "ACTIVE",
      teamId,
      zoneId,
    };

    const tasks = [
      makeTask({
        _id: new Types.ObjectId(),
        scope: "TEAM",
        teamId: new Types.ObjectId(teamId),
        title: "Team task",
      }),
      makeTask({
        _id: new Types.ObjectId(),
        regionId: new Types.ObjectId(regionId),
        scope: "REGION",
        teamId: new Types.ObjectId(teamId),
        title: "Region task",
        zoneId: new Types.ObjectId(zoneId),
      }),
      makeTask({
        _id: new Types.ObjectId(),
        scope: "ZONE",
        teamId: new Types.ObjectId(teamId),
        title: "Zone task",
        zoneId: new Types.ObjectId(zoneId),
      }),
    ];

    expect(filterManageableTasksForActor(actor, tasks).map((task) => task.title)).toEqual([
      "Region task",
      "Zone task",
    ]);
  });

  it("keeps all matching-team tasks for a team lead", () => {
    const teamId = new Types.ObjectId().toString();
    const actor: SessionUser = {
      fullName: "Team lead",
      id: "team-lead",
      role: "TEAM_LEAD",
      status: "ACTIVE",
      teamId,
    };

    const tasks = [
      makeTask({
        _id: new Types.ObjectId(),
        scope: "TEAM",
        teamId: new Types.ObjectId(teamId),
        title: "Team task",
      }),
      makeTask({
        _id: new Types.ObjectId(),
        scope: "ZONE",
        teamId: new Types.ObjectId(teamId),
        title: "Zone task",
      }),
      makeTask({
        _id: new Types.ObjectId(),
        scope: "REGION",
        teamId: new Types.ObjectId(),
        title: "Other team task",
      }),
    ];

    expect(filterManageableTasksForActor(actor, tasks).map((task) => task.title)).toEqual([
      "Team task",
      "Zone task",
    ]);
  });
});

describe("task external links", () => {
  it("maps external link fields with a default label", () => {
    const task = makeTask({
      _id: new Types.ObjectId(),
      externalUrl: "https://forms.example.com/check-in",
      scope: "TEAM",
      teamId: new Types.ObjectId(),
      title: "Open form",
    });

    expect(mapTask(task)).toMatchObject({
      externalLabel: "Mở liên kết",
      externalUrl: "https://forms.example.com/check-in",
    });
  });

  it("normalizes labels and rejects unsafe protocols", () => {
    expect(
      normalizeTaskExternalLink({
        externalLabel: "  Mở app con  ",
        externalUrl: "  https://example.com/app  ",
      }),
    ).toEqual({
      label: "Mở app con",
      url: "https://example.com/app",
    });

    expect(() =>
      normalizeTaskExternalLink({ externalUrl: "javascript:alert(1)" }),
    ).toThrow("Liên kết phải bắt đầu bằng http:// hoặc https://.");
  });
});
