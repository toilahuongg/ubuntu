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

export const SEED_ADMIN_EMAIL = "admin@ubuntu.misoapps.com";
export const SEED_ADMIN_PASSWORD = "12345678";

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

export async function seedAdminAccount() {
  await connectToDatabase();
  await clearSeedData();

  const passwordHash = await hashPassword(SEED_ADMIN_PASSWORD);
  await UserModel.create({
    avatarUrl: null,
    bio: "Tài khoản quản trị hệ thống.",
    email: SEED_ADMIN_EMAIL,
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

  return {
    email: SEED_ADMIN_EMAIL,
    role: "ADMIN" as const,
    username: "admin",
  };
}
