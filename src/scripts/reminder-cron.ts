import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";

import { getAppTimezone } from "@/lib/dates";
import {
  runDailyReminderSweep,
  runMonthlyGoalReminderSweep,
} from "@/lib/tasks/reminder-delivery";

let isRunning = false;

async function runSweep() {
  if (isRunning) {
    console.warn("[reminder-cron] previous sweep is still running; skipped tick");
    return;
  }

  isRunning = true;
  const startedAt = new Date();
  try {
    const [daily, monthlyGoals] = await Promise.all([
      runDailyReminderSweep({ sweepAt: startedAt }),
      runMonthlyGoalReminderSweep({ sweepAt: startedAt }),
    ]);
    console.log("[reminder-cron] sweep complete", {
      daily,
      monthlyGoals,
      sweepAt: startedAt.toISOString(),
    });
  } catch (error) {
    console.error("[reminder-cron] sweep failed", error);
  } finally {
    isRunning = false;
  }
}

const timezone = getAppTimezone();
const task = cron.schedule(
  "* * * * *",
  () => {
    void runSweep();
  },
  { timezone },
);

console.log(`[reminder-cron] started; timezone=${timezone}`);
void runSweep();

function shutdown(signal: NodeJS.Signals) {
  console.log(`[reminder-cron] received ${signal}; stopping`);
  task.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
