import { describe, expect, it } from "vitest";

import { imageUrl } from "./VersionedImage";

describe("imageUrl", () => {
  it("keeps local public image paths unchanged", () => {
    expect(imageUrl("/icons/logo.png")).toBe("/icons/logo.png");
  });

  it("keeps remote image URLs unchanged", () => {
    expect(imageUrl("https://example.com/avatar.png")).toBe(
      "https://example.com/avatar.png",
    );
  });
});
