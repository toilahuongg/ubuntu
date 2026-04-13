import { NextResponse } from "next/server";

import { getTodayDateKey } from "@/lib/dates";
import { requireEnv } from "@/lib/env";
import { generateOccurrencesForDate } from "@/lib/services/task-service";

function isAuthorized(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  return secret && secret === requireEnv("CRON_SECRET");
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  const result = await generateOccurrencesForDate(getTodayDateKey());
  return NextResponse.json(result);
}
