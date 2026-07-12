import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import { DttClassTaskModel } from "./dtt-class-task";

describe("DttClassTask Model Test", () => {
  it("should reject creation without required fields", async () => {
    const doc = new DttClassTaskModel({});
    await expect(doc.validate()).rejects.toThrow();
  });

  it("should require classId, taskId, and teamId", async () => {
    const doc = new DttClassTaskModel({
      classId: new Types.ObjectId(),
    });
    await expect(doc.validate()).rejects.toThrow();
  });

  it("should accept valid data with isInherited defaulting to false", async () => {
    const doc = new DttClassTaskModel({
      classId: new Types.ObjectId(),
      taskId: new Types.ObjectId(),
      teamId: new Types.ObjectId(),
    });
    await expect(doc.validate()).resolves.not.toThrow();
    expect(doc.isInherited).toBe(false);
  });

  it("should accept isInherited: true", async () => {
    const doc = new DttClassTaskModel({
      classId: new Types.ObjectId(),
      taskId: new Types.ObjectId(),
      teamId: new Types.ObjectId(),
      isInherited: true,
    });
    await expect(doc.validate()).resolves.not.toThrow();
    expect(doc.isInherited).toBe(true);
  });
});
