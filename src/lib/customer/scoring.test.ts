import { describe, expect, it } from "vitest";

import { calculateInteractionScore } from "@/lib/customer/scoring";

describe("calculateInteractionScore", () => {
  it("returns 0 for NONE", () => {
    expect(calculateInteractionScore("NONE")).toEqual({ points: 0, exp: 0 });
  });

  it("returns +50 points and +50 exp for SIMPLE", () => {
    expect(calculateInteractionScore("SIMPLE")).toEqual({ points: 50, exp: 50 });
  });

  it("returns +100 points and +100 exp for EFFECTIVE", () => {
    expect(calculateInteractionScore("EFFECTIVE")).toEqual({
      points: 100,
      exp: 100,
    });
  });

  it("returns +1000 points and +1000 exp for BAPTIZED", () => {
    expect(calculateInteractionScore("BAPTIZED")).toEqual({
      points: 1000,
      exp: 1000,
    });
  });
});
