import { InteractionOutcome } from "@/lib/customer/constants";

export interface InteractionScore {
  exp: number;
  points: number;
}

export function calculateInteractionScore(
  outcome: InteractionOutcome,
): InteractionScore {
  switch (outcome) {
    case "SIMPLE":
      return { exp: 5, points: 5 };
    case "EFFECTIVE":
      return { exp: 50, points: 50 };
    case "BAPTIZED":
      return { exp: 1000, points: 1000 };
    case "NONE":
    default:
      return { exp: 0, points: 0 };
  }
}
