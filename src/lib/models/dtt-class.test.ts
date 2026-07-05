import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import { DttClassModel } from "./dtt-class";
import { DttEnrollmentModel } from "./dtt-enrollment";

describe("DTT Models Test", () => {
  it("should reject creation without required fields in DttClass", async () => {
    const doc = new DttClassModel({});
    await expect(doc.validate()).rejects.toThrow();
  });

  it("should reject creation without required fields in DttEnrollment", async () => {
    const doc = new DttEnrollmentModel({});
    await expect(doc.validate()).rejects.toThrow();
  });

  it("should require startDayOfWeek to be between 1 and 7, and default to 1", async () => {
    const doc = new DttClassModel({
      name: "Test Class",
      teamId: new Types.ObjectId(),
      createdBy: new Types.ObjectId(),
    });
    expect(doc.startDayOfWeek).toBe(1);

    doc.startDayOfWeek = 8;
    await expect(doc.validate()).rejects.toThrow();

    doc.startDayOfWeek = 0;
    await expect(doc.validate()).rejects.toThrow();

    doc.startDayOfWeek = 3;
    await expect(doc.validate()).resolves.not.toThrow();
  });
});

