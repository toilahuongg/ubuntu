import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

import {
  TaskOccurrenceModel,
  TaskTemplateModel,
  TeamModel,
  UserModel,
} from "@/lib/models";
import { generateOccurrencesForDate } from "@/lib/services/task-service";

let mongoServer: MongoMemoryServer;

describe("generateOccurrencesForDate", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    vi.stubEnv("MONGODB_URI", mongoServer.getUri());
  });

  beforeEach(async () => {
    await mongoose.connect(process.env.MONGODB_URI!, { dbName: "daily-task-app" });
    await Promise.all([
      TaskOccurrenceModel.deleteMany({}),
      TaskTemplateModel.deleteMany({}),
      UserModel.deleteMany({}),
      TeamModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    vi.unstubAllEnvs();
  });

  it("creates only one occurrence per template and date", async () => {
    const team = await TeamModel.create({ code: "T1", name: "Team 1" });
    const actor = await UserModel.create({
      fullName: "Lead",
      role: "TEAM_LEAD",
      status: "ACTIVE",
      teamId: team._id,
    });

    await TaskTemplateModel.create({
      createdBy: actor._id,
      deadlineTime: "17:30",
      description: "Daily report",
      isActive: true,
      teamId: team._id,
      title: "Report",
    });

    await generateOccurrencesForDate("2026-04-13");
    await generateOccurrencesForDate("2026-04-13");

    expect(await TaskOccurrenceModel.countDocuments()).toBe(1);
  });
});
