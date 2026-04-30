import { requireEnv } from "@/lib/env";
import { runMonthlyGoalReminderSweep } from "@/lib/tasks/reminder-delivery";
import { runApiHandler } from "./api._utils";

function isAuthorized(request: Request) {
  if (request.headers.get("x-vercel-cron")) return true;
  const secret = request.headers.get("x-cron-secret");
  return !!secret && secret === requireEnv("CRON_SECRET");
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized cron request." }, { status: 401 });
  }
  return Response.json(await runMonthlyGoalReminderSweep());
}

export function loader({ request }: { request: Request }) { return runApiHandler(request, run); }
export function action({ request }: { request: Request }) { return runApiHandler(request, run); }
