import { describe, expect, it } from "vitest";

import {
  clearSettledDttOverrides,
  mergeDttTaskState,
  type DttTaskOverrides,
} from "./dtt-task-state";

describe("DTT task local state", () => {
  const tasks = [
    { id: "task-1", title: "TP hằng tuần", isDtt: false },
    { id: "task-2", title: "Nhóm hiệp sống", isDtt: false },
  ];

  it("keeps a local enabled switch when refreshed server props are stale", () => {
    const overrides: DttTaskOverrides = { "task-1": true };

    expect(mergeDttTaskState(tasks, overrides)).toEqual([
      { id: "task-1", title: "TP hằng tuần", isDtt: true },
      { id: "task-2", title: "Nhóm hiệp sống", isDtt: false },
    ]);
  });

  it("removes an override once server props match it", () => {
    const overrides: DttTaskOverrides = { "task-1": true };
    const freshTasks = [{ id: "task-1", title: "TP hằng tuần", isDtt: true }];

    expect(clearSettledDttOverrides(freshTasks, overrides)).toEqual({});
  });
});
