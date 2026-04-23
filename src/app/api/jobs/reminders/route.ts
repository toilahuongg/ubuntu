import { NextResponse } from "next/server";

import { requireEnv } from "@/lib/env";
import { runDailyReminderSweep } from "@/lib/tasks/reminder-delivery";

function isAuthorized(request: Request) {
  if (request.headers.get("x-vercel-cron")) return true;
  const secret = request.headers.get("x-cron-secret");
  return !!secret && secret === requireEnv("CRON_SECRET");
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized cron request." },
      { status: 401 },
    );
  }

  return NextResponse.json(await runDailyReminderSweep());
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
