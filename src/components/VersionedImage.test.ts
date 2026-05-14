import { describe, expect, it } from "vitest";

import { imageVersion, versionedImageUrl } from "./VersionedImage";

describe("imageVersion", () => {
  it("uses the public asset version when available", () => {
    expect(
      imageVersion({
        NEXT_PUBLIC_ASSET_VERSION: "abc123",
        NEXT_PUBLIC_APP_VERSION: "0.1.0",
        npm_package_version: "1.0.0",
      }),
    ).toBe("abc123");
  });
});

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
