import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { connectToDatabase } from "@/lib/mongoose";
import { UserModel } from "@/lib/models";
import { changeUserPassword } from "@/lib/services/organization-service";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.SESSION_SECRET = "test-secret-session-key-123456789";
  process.env.AUTH_SECRET = "test-auth-secret-1234567890";
});

afterAll(async () => {
  await mongo.stop();
});

async function createTestUser(overrides: Record<string, unknown> = {}) {
  await connectToDatabase();
  return UserModel.create({
    fullName: "Test User",
    role: "MEMBER",
    status: "ACTIVE",
    ...overrides,
  });
}

describe("changeUserPassword", () => {
  it("rejects when user has no passwordHash set", async () => {
    const user = await createTestUser();
    await expect(
      changeUserPassword(user._id.toString(), "old", "newPassword123"),
    ).rejects.toThrow(
      "Tài khoản của bạn hiện đăng nhập qua Google/Telegram. Vui lòng đặt mật khẩu trước khi đổi.",
    );
  });

  it("rejects when current password is wrong", async () => {
    const passwordHash = await hashPassword("correctPassword123");
    const user = await createTestUser({ passwordHash });
    await expect(
      changeUserPassword(user._id.toString(), "wrongPassword", "newPassword123"),
    ).rejects.toThrow("Mật khẩu hiện tại không đúng.");
  });

  it("changes password successfully with correct current password", async () => {
    const passwordHash = await hashPassword("correctPassword123");
    const user = await createTestUser({ passwordHash });

    await changeUserPassword(
      user._id.toString(),
      "correctPassword123",
      "newSecurePass456",
    );

    const refreshed = await UserModel.findById(user._id).lean();
    expect(refreshed).not.toBeNull();
    expect(
      await verifyPassword("newSecurePass456", (refreshed as any).passwordHash),
    ).toBe(true);
    expect(
      await verifyPassword("correctPassword123", (refreshed as any).passwordHash),
    ).toBe(false);
  });

  it("rejects new passwords shorter than 8 characters", async () => {
    const passwordHash = await hashPassword("correctPassword123");
    const user = await createTestUser({ passwordHash });
    await expect(
      changeUserPassword(user._id.toString(), "correctPassword123", "short"),
    ).rejects.toThrow("Mật khẩu tối thiểu 8 ký tự.");
  });
});
