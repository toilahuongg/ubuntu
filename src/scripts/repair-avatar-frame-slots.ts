import mongoose from "mongoose";

import { AVATAR_FRAME_CODE_PREFIX } from "@/lib/cosmetics/avatar-frame-slot-repair";
import { connectToDatabase } from "@/lib/mongoose";
import { CosmeticModel } from "@/lib/models";

async function main() {
  await connectToDatabase();

  const result = await CosmeticModel.updateMany(
    {
      code: { $regex: `^${AVATAR_FRAME_CODE_PREFIX}` },
      slot: { $ne: "avatarFrame" },
    },
    { $set: { slot: "avatarFrame" } },
  );

  console.log(
    `Repaired avatar frame slots: matched ${result.matchedCount}, modified ${result.modifiedCount}.`,
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
