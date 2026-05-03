import { describe, expect, it } from "vitest";

import { calculateInteractionScore } from "@/lib/customer/scoring";

describe("calculateInteractionScore", () => {
  it("returns 0 for NONE", () => {
    expect(calculateInteractionScore("NONE")).toEqual({ points: 0, exp: 0 });
  });

  it("returns +5 points and +5 exp for SIMPLE", () => {
    expect(calculateInteractionScore("SIMPLE")).toEqual({ points: 5, exp: 5 });
  });

  it("returns +50 points and +50 exp for EFFECTIVE", () => {
    expect(calculateInteractionScore("EFFECTIVE")).toEqual({
      points: 50,
      exp: 50,
    });
  });

  it("returns +500 points and +500 exp for BAPTIZED", () => {
    expect(calculateInteractionScore("BAPTIZED")).toEqual({
      points: 500,
      exp: 500,
    });
  });
});
