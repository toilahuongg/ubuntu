import { describe, expect, it } from "vitest";

import { shouldRepairAvatarFrameSlot } from "./avatar-frame-slot-repair";

describe("shouldRepairAvatarFrameSlot", () => {
  it("repairs legacy avatar frame records saved under another slot", () => {
    expect(
      shouldRepairAvatarFrameSlot({
        code: "avatar_frame_cyber_aqua",
        slot: "prefix",
      }),
    ).toBe(true);
  });

  it("does not repair avatar frames that already use the avatar frame slot", () => {
    expect(
      shouldRepairAvatarFrameSlot({
        code: "avatar_frame_cyber_aqua",
        slot: "avatarFrame",
      }),
    ).toBe(false);
  });

  it("does not repair non-avatar-frame cosmetics", () => {
    expect(
      shouldRepairAvatarFrameSlot({
        code: "prefix_cyber_aqua",
        slot: "prefix",
      }),
    ).toBe(false);
  });
});
