import { describe, it, expect, beforeEach } from "vitest";
import { connectToDatabase } from "@/lib/mongoose";
import { DttClassModel } from "./dtt-class";
import { DttEnrollmentModel } from "./dtt-enrollment";
import { Types } from "mongoose";

describe("DTT Models Test", () => {
  it("should reject creation without required fields in DttClass", async () => {
    const doc = new DttClassModel({});
    let err: any = null;
    try {
      await doc.validate();
    } catch (e) {
      err = e;
    }
    expect(err).not.toBeNull();
  });

  it("should reject creation without required fields in DttEnrollment", async () => {
    const doc = new DttEnrollmentModel({});
    let err: any = null;
    try {
      await doc.validate();
    } catch (e) {
      err = e;
    }
    expect(err).not.toBeNull();
  });
});
