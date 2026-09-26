import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose from "mongoose";

import { hashPassword } from "@/lib/auth/password";
import { connectToDatabase } from "@/lib/mongoose";
import {
  AuditLogModel,
  MonthlyGoalModel,
  PointTransactionModel,
  PushSubscriptionModel,
  RegionModel,
  ReminderLogModel,
  SubmissionModel,
  TaskModel,
  TaskReminderPreferenceModel,
  TeamModel,
  TelegramPendingGroupModel,
  UserCosmeticModel,
  UserModel,
  XpTransactionModel,
  ZoneModel,
} from "@/lib/models";

const ADMIN_EMAIL = "admin@ubuntu.misoapps.com";
const ADMIN_PASSWORD = "12345678";

async function clearSeedData() {
  await Promise.all([
    AuditLogModel.deleteMany({}),
    MonthlyGoalModel.deleteMany({}),
    PointTransactionModel.deleteMany({}),
    PushSubscriptionModel.deleteMany({}),
    ReminderLogModel.deleteMany({}),
    SubmissionModel.deleteMany({}),
    TaskModel.deleteMany({}),
    TaskReminderPreferenceModel.deleteMany({}),
    TelegramPendingGroupModel.deleteMany({}),
    UserCosmeticModel.deleteMany({}),
    XpTransactionModel.deleteMany({}),
    UserModel.deleteMany({}),
    RegionModel.deleteMany({}),
    ZoneModel.deleteMany({}),
    TeamModel.deleteMany({}),
  ]);
}

async function main() {
  await connectToDatabase();
  await clearSeedData();

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await UserModel.create({
    avatarUrl: null,
    bio: "Tài khoản quản trị hệ thống.",
    email: ADMIN_EMAIL,
    fullName: "Admin Ubuntu",
    gender: "male",
    googleId: null,
    level: 1,
    passwordHash,
    pointBalance: 0,
    regionId: null,
    role: "ADMIN",
    status: "ACTIVE",
    teamId: null,
    telegramId: null,
    totalXp: 0,
    username: "admin",
    zoneId: null,
  });

  console.log("Seed completed. Created 1 admin account.");
  console.table([
    {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
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
