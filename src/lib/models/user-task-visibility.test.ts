import { describe, it, expect } from "vitest";
import { UserTaskVisibilityModel } from "./user-task-visibility";
import { Types } from "mongoose";

describe("UserTaskVisibilityModel", () => {
  it("should validate visibility override successfully", async () => {
    const doc = new UserTaskVisibilityModel({
      userId: new Types.ObjectId(),
      taskId: new Types.ObjectId(),
      isVisible: false,
      updatedBy: new Types.ObjectId(),
    });
    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.isVisible).toBe(false);
  });
});
