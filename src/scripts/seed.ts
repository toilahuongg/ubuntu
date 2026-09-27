import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose from "mongoose";

import {
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_PASSWORD,
  seedAdminAccount,
} from "@/lib/seed";

async function main() {
  await seedAdminAccount();

  console.log("Seed completed. Created 1 admin account.");
  console.table([
    {
      email: SEED_ADMIN_EMAIL,
      password: SEED_ADMIN_PASSWORD,
      role: "ADMIN",
    },
  ]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
