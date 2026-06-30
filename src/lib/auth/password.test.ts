import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password auth helpers", () => {
  it("hashes passwords without storing the raw value", async () => {
    const hash = await hashPassword("secret123");

    expect(hash).not.toBe("secret123");
    expect(hash).toMatch(/^scrypt\$/);
    await expect(verifyPassword("secret123", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrongpass", hash)).resolves.toBe(false);
  });

  it("rejects passwords shorter than 8 characters", async () => {
    await expect(hashPassword("short")).rejects.toThrow("Mật khẩu tối thiểu 8 ký tự.");
  });
});
