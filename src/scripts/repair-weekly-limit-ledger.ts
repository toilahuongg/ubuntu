import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongoose";
import {
  repairWeeklyLimitLedgerReconciliation,
  type WeeklyLimitLedgerReconciliation,
  type WeeklyLimitLedgerReconciliationReport,
} from "@/lib/tasks/weekly-limit-repair";

function hasArg(name: string) {
  return process.argv.includes(name);
}

function formatRow(modeLabel: string, row: WeeklyLimitLedgerReconciliation) {
  const pointAmount = Math.abs(row.pointTransaction?.amount ?? 0);
  const xpAmount = Math.abs(row.xpTransaction?.amount ?? 0);
  return [
    `[${modeLabel}]`,
    `user="${row.user.fullName}"`,
    `pointLedger=${row.pointLedgerTotal}`,
    `pointBalance=${row.user.pointBalance}`,
    `points-=${pointAmount}`,
    `xpLedger=${row.totalXpLedgerTotal}`,
    `totalXp=${row.user.totalXp}`,
    `xp-=${xpAmount}`,
  ].join(" ");
}

function printReport(
  report: WeeklyLimitLedgerReconciliationReport,
  apply: boolean,
) {
  const modeLabel = apply ? "APPLY" : "DRY-RUN";

  if (report.rows.length === 0) {
    console.log(`[${modeLabel}] Không thấy user nào thiếu transaction âm.`);
  }

  for (const row of report.rows) {
    console.log(formatRow(modeLabel, row));
  }

  console.table(report.totals);

  if (!apply) {
    console.log(
      "Dry-run: chưa ghi DB. Chạy lại với --apply để tạo transaction âm bù ledger.",
    );
  }
}

async function main() {
  const apply = hasArg("--apply");

  await connectToDatabase();

  const report = await repairWeeklyLimitLedgerReconciliation({ apply });
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
