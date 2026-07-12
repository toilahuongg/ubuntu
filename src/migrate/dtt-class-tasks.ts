/**
 * Migration: Move existing isDtt=true tasks to DttClassTask model.
 *
 * Usage: npx tsx src/migrate/dtt-class-tasks.ts
 *
 * Steps:
 * 1. Finds all tasks with isDtt: true
 * 2. Finds or creates a default DTT class "Lớp ĐTT Tổng" per team
 * 3. Creates DttClassTask entries (isInherited: true) for each
 * 4. Logs the migration summary
 *
 * After running, manually remove isDtt from Task schema (Task 3).
 */

import mongoose from "mongoose";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not set in .env");
  process.exit(1);
}

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const TaskModel = mongoose.model("Task", new mongoose.Schema({}, { strict: false }));
  const DttClassModel = mongoose.model("DttClass", new mongoose.Schema({}, { strict: false }));
  const DttClassTaskModel = mongoose.model("DttClassTask", new mongoose.Schema({}, { strict: false }));

  // Step 1: Find all isDtt=true tasks
  const dttTasks = await TaskModel.find({ isDtt: true }).select("_id title teamId").lean();
  console.log(`\nFound ${dttTasks.length} tasks with isDtt: true`);

  if (dttTasks.length === 0) {
    console.log("No tasks to migrate. Done.");
    await mongoose.disconnect();
    return;
  }

  // Group by teamId
  const teamMap = new Map<string, typeof dttTasks>();
  for (const task of dttTasks) {
    const tid = task.teamId.toString();
    if (!teamMap.has(tid)) teamMap.set(tid, []);
    teamMap.get(tid)!.push(task);
  }

  console.log(`Tasks distributed across ${teamMap.size} team(s)`);

  // Step 2: For each team, find or create default class
  for (const [teamId, tasks] of teamMap) {
    console.log(`\n── Team: ${teamId} (${tasks.length} tasks) ──`);

    let defaultClass = await DttClassModel.findOne({
      teamId: new mongoose.Types.ObjectId(teamId),
      name: "Lớp ĐTT Tổng",
    }).lean();

    if (!defaultClass) {
      const firstTaskCreatedBy = tasks[0]?.createdBy;
      defaultClass = await DttClassModel.create({
        name: "Lớp ĐTT Tổng",
        teamId: new mongoose.Types.ObjectId(teamId),
        createdBy: firstTaskCreatedBy ? new mongoose.Types.ObjectId(firstTaskCreatedBy) : new mongoose.Types.ObjectId(),
        startDayOfWeek: 1,
      });
      console.log(`  Created default class: ${defaultClass.name} (${defaultClass._id})`);
    } else {
      console.log(`  Using existing default class: ${defaultClass.name} (${defaultClass._id})`);
    }

    // Step 3: Create DttClassTask entries
    let created = 0;
    let skipped = 0;

    for (const task of tasks) {
      const existing = await DttClassTaskModel.findOne({
        classId: defaultClass._id,
        taskId: task._id,
      });

      if (existing) {
        skipped++;
        continue;
      }

      await DttClassTaskModel.create({
        classId: defaultClass._id,
        taskId: task._id,
        teamId: new mongoose.Types.ObjectId(teamId),
        isInherited: true,
      });
      created++;
      console.log(`  ✓ Migrated: "${task.title}"`);
    }

    console.log(`  Result: ${created} created, ${skipped} skipped`);
  }

  console.log("\n✅ Migration complete.");
  console.log("Next step: Remove isDtt field from Task schema (Task 3).");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
