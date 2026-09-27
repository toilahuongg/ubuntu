import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { seedAdminAccountMock } = vi.hoisted(() => ({
  seedAdminAccountMock: vi.fn().mockResolvedValue({
    email: "admin@ubuntu.misoapps.com",
    role: "ADMIN",
    username: "admin",
  }),
}));

vi.mock("@/lib/seed", () => ({
  seedAdminAccount: seedAdminAccountMock,
}));

import { POST } from "@/app/api/seed/route";

function buildRequest(secret?: string) {
  return new Request("http://localhost/api/seed", {
    headers: secret ? { "x-seed-secret": secret } : undefined,
    method: "POST",
  });
}

describe("seed route", () => {
  beforeEach(() => {
    vi.stubEnv("SEED_SECRET", "seed-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("rejects requests without the configured secret", async () => {
    const response = await POST(buildRequest());

    expect(response.status).toBe(401);
    expect(seedAdminAccountMock).not.toHaveBeenCalled();
  });

  it("resets data and returns the created admin", async () => {
    const response = await POST(buildRequest("seed-secret"));

    expect(response.status).toBe(200);
    expect(seedAdminAccountMock).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual({
      admin: {
        email: "admin@ubuntu.misoapps.com",
        role: "ADMIN",
        username: "admin",
      },
      message: "Seed completed. Created 1 admin account.",
    });
  });

  it("fails closed when SEED_SECRET is missing", async () => {
    vi.stubEnv("SEED_SECRET", "");

    await expect(POST(buildRequest("seed-secret"))).rejects.toThrow(
      /SEED_SECRET/,
    );
    expect(seedAdminAccountMock).not.toHaveBeenCalled();
  });
});
