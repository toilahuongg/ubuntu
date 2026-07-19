import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { connectToDatabase } from "@/lib/mongoose";
import { UserModel } from "@/lib/models";
import {
  changeUserPassword,
  resetManagedUserPassword,
} from "@/lib/services/organization-service";

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

async function getStoredPasswordHash(userId: unknown) {
  const refreshed = await UserModel.findById(userId).lean<{
    passwordHash?: string | null;
  }>();
  expect(refreshed).not.toBeNull();
  return refreshed?.passwordHash ?? null;
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

    const passwordHashAfterChange = await getStoredPasswordHash(user._id);
    expect(
      await verifyPassword("newSecurePass456", passwordHashAfterChange),
    ).toBe(true);
    expect(
      await verifyPassword("correctPassword123", passwordHashAfterChange),
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

describe("resetManagedUserPassword", () => {
  it("lets a CS-DL reset a member password inside their team", async () => {
    const teamId = "507f1f77bcf86cd799439022";
    const passwordHash = await hashPassword("oldPassword123");
    const user = await createTestUser({
      passwordHash,
      role: "MEMBER",
      teamId,
    });

    const result = await resetManagedUserPassword(
      {
        fullName: "Team Lead",
        id: "507f1f77bcf86cd799439012",
        role: "TEAM_LEAD",
        status: "ACTIVE",
        teamId,
      },
      user._id.toString(),
    );

    expect(result.temporaryPassword).toHaveLength(12);
    const passwordHashAfterReset = await getStoredPasswordHash(user._id);
    expect(
      await verifyPassword(
        result.temporaryPassword,
        passwordHashAfterReset,
      ),
    ).toBe(true);
    expect(
      await verifyPassword("oldPassword123", passwordHashAfterReset),
    ).toBe(false);
  });

  it("rejects users outside the CS-DL team", async () => {
    const user = await createTestUser({
      role: "MEMBER",
      teamId: "507f1f77bcf86cd799439033",
    });

    await expect(
      resetManagedUserPassword(
        {
          fullName: "Team Lead",
          id: "507f1f77bcf86cd799439012",
          role: "TEAM_LEAD",
          status: "ACTIVE",
          teamId: "507f1f77bcf86cd799439022",
        },
        user._id.toString(),
      ),
    ).rejects.toThrow("Bạn không có quyền reset mật khẩu người dùng này.");
  });

  it("rejects resetting management accounts", async () => {
    const teamId = "507f1f77bcf86cd799439022";
    const user = await createTestUser({
      role: "ZONE_LEAD",
      teamId,
    });

    await expect(
      resetManagedUserPassword(
        {
          fullName: "Team Lead",
          id: "507f1f77bcf86cd799439012",
          role: "TEAM_LEAD",
          status: "ACTIVE",
          teamId,
        },
        user._id.toString(),
      ),
    ).rejects.toThrow("Chỉ có thể reset mật khẩu cho TĐ/TĐM/NTĐ.");
  });
});
