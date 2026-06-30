import { describe, it, expect } from "vitest";
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
});
