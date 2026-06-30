import { describe, expect, it } from "vitest";

import {
  COSMETIC_FORM_SLOTS,
  cosmeticFormPreviewMode,
  cosmeticSlotUsesImageIcon,
} from "./cosmetic-form-options";

describe("cosmetic form options", () => {
  it("allows avatar frame cosmetics to be edited as their own slot", () => {
    expect(COSMETIC_FORM_SLOTS.map((slot) => slot.value)).toContain(
      "avatarFrame",
    );
  });

  it("previews avatar frames on an avatar instead of the decorated name", () => {
    expect(cosmeticFormPreviewMode("avatarFrame")).toBe("avatar");
    expect(cosmeticFormPreviewMode("prefix")).toBe("name");
  });

  it("collects image icon paths for avatar frames", () => {
    expect(cosmeticSlotUsesImageIcon("avatarFrame")).toBe(true);
  });
});
