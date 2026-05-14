import { describe, expect, it } from "vitest";

import { versionedImageUrl } from "./VersionedImage";

describe("versionedImageUrl", () => {
  it("adds the app version to local public image paths", () => {
    expect(versionedImageUrl("/icons/logo.png")).toBe(
      "/icons/logo.png?v=0.1.0",
    );
  });

  it("keeps remote image URLs unchanged", () => {
    expect(versionedImageUrl("https://example.com/avatar.png")).toBe(
      "https://example.com/avatar.png",
    );
  });
});
