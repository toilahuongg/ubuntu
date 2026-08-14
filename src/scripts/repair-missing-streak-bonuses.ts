import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongoose";
import {
  repairMissingTaskStreakBonuses,
  type TaskStreakBonusRepairReport,
  type TaskStreakBonusRepairRow,
} from "@/lib/tasks/streak-bonus-repair";

const DEFAULT_FROM_DATE = "2026-07-01";

function hasArg(name: string) {
  return process.argv.includes(name);
}

function readStringArg(name: string) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function readDateArg(name: string, fallback?: string) {
  const value = readStringArg(name) ?? fallback;
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Tham số ${name} phải có dạng YYYY-MM-DD.`);
  }
  return value;
}

function formatRow(modeLabel: string, row: TaskStreakBonusRepairRow) {
  return [
    `[${modeLabel}]`,
    `period=${row.periodKey}`,
    `date=${row.date}`,
    `task="${row.taskTitle}"`,
    `taskId=${row.taskId}`,
    `userId=${row.userId}`,
    `milestone=${row.milestone}`,
    `xp+=${row.bonusExp}`,
    `points+=${row.bonusPoints}`,
  ].join(" ");
}

function printReport(report: TaskStreakBonusRepairReport, apply: boolean) {
  const modeLabel = apply ? "APPLY" : "DRY-RUN";

  if (report.rows.length === 0) {
    console.log(`[${modeLabel}] Không thấy thưởng chuỗi nào bị thiếu.`);
  }

  for (const row of report.rows) {
    console.log(formatRow(modeLabel, row));
  }

  console.table(report.totals);

  if (!apply) {
    console.log(
      "Dry-run: chưa ghi DB. Chạy lại với --apply để tạo transaction và cộng XP/points.",
    );
  }
}

async function main() {
  const apply = hasArg("--apply");
  const fromDate = readDateArg("--from", DEFAULT_FROM_DATE);
  const toDate = readDateArg("--to");

  if (!fromDate) {
    throw new Error("Thiếu --from.");
  }

  await connectToDatabase();

  const report = await repairMissingTaskStreakBonuses({
    apply,
    fromDate,
    toDate,
  });
  printReport(report, apply);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
