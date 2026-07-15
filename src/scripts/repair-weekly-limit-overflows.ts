import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongoose";
import {
  repairWeeklyLimitOverflows,
  type WeeklyLimitRepairGroup,
  type WeeklyLimitRepairPlan,
} from "@/lib/tasks/weekly-limit-repair";

const DEFAULT_FROM_DATE = "2026-07-01";

function hasArg(name: string) {
  return process.argv.includes(name);
}

function readStringArg(name: string) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readFromDate() {
  const fromDate = readStringArg("--from") ?? DEFAULT_FROM_DATE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
    throw new Error("Tham số --from phải có dạng YYYY-MM-DD.");
  }
  return fromDate;
}

function formatGroup(modeLabel: string, group: WeeklyLimitRepairGroup) {
  return [
    `[${modeLabel}]`,
    `week=${group.weekStart}..${group.weekEnd}`,
    `task="${group.taskTitle}"`,
    `user="${group.userFullName}"`,
    `total=${group.completionCountBefore}`,
    `limit=${group.limit}`,
    `keep=${group.completionCountKept}`,
    `delete=${group.completionCountDeleted}`,
    `submissionsDelete=${group.submissionsDeleted}`,
    `xp-=${group.xpDeducted}`,
    `points-=${group.pointsDeducted}`,
  ].join(" ");
}

function printReport(plan: WeeklyLimitRepairPlan, apply: boolean) {
  const modeLabel = apply ? "APPLY" : "DRY-RUN";

  if (plan.groups.length === 0) {
    console.log(`[${modeLabel}] Không có weekly submission nào vượt giới hạn.`);
  }

  for (const group of plan.groups) {
    console.log(formatGroup(modeLabel, group));
  }

  console.table({
    groupsScanned: plan.totals.groupsScanned,
    overflowGroups: plan.totals.overflowGroups,
    submissionsDeleted: plan.totals.submissionsDeleted,
    completionCountDeleted: plan.totals.completionCountDeleted,
    xpDeducted: plan.totals.xpDeducted,
    pointsDeducted: plan.totals.pointsDeducted,
  });

  if (!apply) {
    console.log("Dry-run: chưa ghi DB. Chạy lại với --apply để xoá và trừ điểm.");
  }
}

async function main() {
  const apply = hasArg("--apply");
  const fromDate = readFromDate();

  await connectToDatabase();

  const plan = await repairWeeklyLimitOverflows({ apply, fromDate });
  printReport(plan, apply);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
