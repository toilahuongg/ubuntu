import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongoose";
import { UserModel } from "@/lib/models";

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

  await UserModel.syncIndexes();
  console.log("Synced new indexes.");
  console.table(await UserModel.collection.indexes());
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
