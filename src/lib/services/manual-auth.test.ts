import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { hashPassword } from "@/lib/auth/password";
import { connectToDatabase } from "@/lib/mongoose";
import { UserModel } from "@/lib/models";
import { authenticateManualUser } from "@/lib/services/organization-service";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
});

beforeEach(async () => {
  await connectToDatabase();
  await UserModel.deleteMany({});
  await UserModel.create({
    email: "admin@ubuntu.misoapps.com",
    fullName: "Admin Ubuntu",
    passwordHash: await hashPassword("12345678"),
    role: "ADMIN",
    status: "ACTIVE",
    username: "admin",
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("authenticateManualUser", () => {
  it("authenticates the seeded admin by email", async () => {
    const user = await authenticateManualUser({
      password: "12345678",
      username: "ADMIN@UBUNTU.MISOAPPS.COM",
    });

    expect(user.email).toBe("admin@ubuntu.misoapps.com");
    expect(user.role).toBe("ADMIN");
  });

  it("keeps username login working", async () => {
    const user = await authenticateManualUser({
      password: "12345678",
      username: "admin",
    });

    expect(user.role).toBe("ADMIN");
  });

  it("rejects an incorrect password", async () => {
    await expect(
      authenticateManualUser({
        password: "incorrect",
        username: "admin@ubuntu.misoapps.com",
      }),
    ).rejects.toThrow("Email, tên đăng nhập hoặc mật khẩu không đúng.");
  });
});
