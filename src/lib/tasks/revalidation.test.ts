import { describe, expect, it } from "vitest";

import {
  DEFAULT_SUBMISSION_REVALIDATION_PATHS,
  resolveSubmissionRevalidationPaths,
} from "@/lib/tasks/revalidation";

describe("resolveSubmissionRevalidationPaths", () => {
  it("falls back to the dashboard path", () => {
    expect(resolveSubmissionRevalidationPaths()).toEqual([
      ...DEFAULT_SUBMISSION_REVALIDATION_PATHS,
    ]);
  });

  it("deduplicates repeated paths", () => {
    expect(
      resolveSubmissionRevalidationPaths([
        "/dashboard",
        "/dashboard",
        "/tasks/task-1",
      ]),
    ).toEqual(["/dashboard", "/tasks/task-1"]);
  });

  it("ignores invalid paths", () => {
    expect(
      resolveSubmissionRevalidationPaths([
        "",
        "dashboard",
        "/dashboard",
        "//invalid",
        "/tasks/task-1",
      ]),
    ).toEqual(["/dashboard", "//invalid", "/tasks/task-1"]);
  });
});
