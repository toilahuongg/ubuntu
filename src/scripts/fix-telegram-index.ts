import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongoose";
import { SubmissionModel, TaskModel, UserModel } from "@/lib/models";

async function main() {
  await connectToDatabase();

  const indexes = (await UserModel.collection.indexes()) as Array<{
    name: string;
    key: Record<string, number>;
    unique?: boolean;
    sparse?: boolean;
    partialFilterExpression?: Record<string, unknown>;
  }>;
  console.log("Current indexes:");
  console.table(indexes);

  for (const idx of indexes) {
    if (idx.key.telegramId && !idx.partialFilterExpression) {
      console.log(`Dropping legacy index ${idx.name}…`);
      await UserModel.collection.dropIndex(idx.name);
    }
  }

  await Promise.all([
    UserModel.syncIndexes(),
    TaskModel.syncIndexes(),
    SubmissionModel.syncIndexes(),
  ]);
  console.log("Synced new indexes.");
  console.table({
    submissions: (await SubmissionModel.collection.indexes()).length,
    tasks: (await TaskModel.collection.indexes()).length,
    users: (await UserModel.collection.indexes()).length,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
