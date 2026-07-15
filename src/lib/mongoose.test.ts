import { describe, expect, it } from "vitest";

import { withRetryWritesDisabled } from "@/lib/mongoose";

describe("withRetryWritesDisabled", () => {
  it("adds retryWrites=false when the Mongo URI has no query string", () => {
    expect(withRetryWritesDisabled("mongodb://localhost:27017/app")).toBe(
      "mongodb://localhost:27017/app?retryWrites=false",
    );
  });

  it("preserves existing query params while disabling retryable writes", () => {
    expect(
      withRetryWritesDisabled("mongodb://localhost:27017/app?authSource=admin"),
    ).toBe("mongodb://localhost:27017/app?authSource=admin&retryWrites=false");
  });

  it("overrides an existing retryWrites=true query param", () => {
    expect(
      withRetryWritesDisabled(
        "mongodb://localhost:27017/app?retryWrites=true&authSource=admin",
      ),
    ).toBe("mongodb://localhost:27017/app?retryWrites=false&authSource=admin");
  });
});
