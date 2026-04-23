import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import mongoose from "mongoose";

import { getCurrentYearMonth, getTodayDateKey } from "@/lib/dates";
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
import { getLevelFromXp } from "@/lib/xp";
import { seedCosmetics } from "@/scripts/seed-cosmetics";

type SeedUser = {
  bio?: string;
  email?: string;
  fullName: string;
  gender?: "male" | "female";
  pointBalance?: number;
  regionKey?: RegionKey;
  role: "ADMIN" | "TEAM_LEAD" | "ZONE_LEAD" | "REGIONAL_LEAD" | "NGV" | "MEMBER";
  status?: "ACTIVE" | "INACTIVE" | "PENDING";
  telegramId?: number;
  totalXp?: number;
  username: string;
  zoneKey?: ZoneKey;
};

type ZoneKey = "mienTay" | "saiGon";
type RegionKey = "canTho" | "quan1" | "quan7";

type SeededUser = {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  role: SeedUser["role"];
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  telegramId: number | null;
  username: string | null;
};

type SeededTask = {
  _id: mongoose.Types.ObjectId;
};

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

  const team = await TeamModel.create({
    code: "TEAM-MIEN-NAM",
    name: "Team Mien Nam",
    telegramChatId: -100900000001,
    telegramChatTitle: "Ubuntu - Team Mien Nam",
  });

  const [zoneSG, zoneMT] = await ZoneModel.create([
    {
      code: "DV-SG",
      name: "Dia Vuc Sai Gon",
      teamId: team._id,
      telegramChatId: -100900000101,
      telegramChatTitle: "Ubuntu - Dia Vuc Sai Gon",
    },
    {
      code: "DV-MT",
      name: "Dia Vuc Mien Tay",
      teamId: team._id,
      telegramChatId: -100900000102,
      telegramChatTitle: "Ubuntu - Dia Vuc Mien Tay",
    },
  ]);

  const [regionA, regionB, regionC] = await RegionModel.create([
    {
      code: "SG-01",
      name: "Khu vuc Quan 1",
      teamId: team._id,
      telegramChatId: -100900001001,
      telegramChatTitle: "Ubuntu - Khu vuc Quan 1",
      zoneId: zoneSG._id,
    },
    {
      code: "SG-02",
      name: "Khu vuc Quan 7",
      teamId: team._id,
      telegramChatId: -100900001002,
      telegramChatTitle: "Ubuntu - Khu vuc Quan 7",
      zoneId: zoneSG._id,
    },
    {
      code: "CT-01",
      name: "Khu vuc Can Tho",
      teamId: team._id,
      telegramChatId: -100900001003,
      telegramChatTitle: "Ubuntu - Khu vuc Can Tho",
      zoneId: zoneMT._id,
    },
  ]);

  const zones = {
    mienTay: zoneMT,
    saiGon: zoneSG,
  };
  const regions = {
    canTho: regionC,
    quan1: regionA,
    quan7: regionB,
  };

  const userSeeds: SeedUser[] = [
    {
      bio: "Tai khoan quan tri he thong.",
      email: "admin@ubuntu.local",
      fullName: "Admin Ubuntu",
      pointBalance: 500,
      role: "ADMIN",
      telegramId: 900000,
      totalXp: 450,
      username: "admin_ubuntu",
    },
    {
      fullName: "Tran Nhom Truong",
      pointBalance: 320,
      role: "TEAM_LEAD",
      telegramId: 900001,
      totalXp: 360,
      username: "team_lead_mien_nam",
    },
    {
      fullName: "Ho Dia Vuc Sai Gon",
      pointBalance: 260,
      role: "ZONE_LEAD",
      telegramId: 900002,
      totalXp: 280,
      username: "zone_lead_sg",
      zoneKey: "saiGon",
    },
    {
      fullName: "Mai Dia Vuc Mien Tay",
      pointBalance: 220,
      role: "ZONE_LEAD",
      telegramId: 900003,
      totalXp: 240,
      username: "zone_lead_mt",
      zoneKey: "mienTay",
    },
    {
      fullName: "Le Khu Vuc Quan 1",
      pointBalance: 180,
      regionKey: "quan1",
      role: "REGIONAL_LEAD",
      telegramId: 900004,
      totalXp: 210,
      username: "regional_lead_q1",
    },
    {
      fullName: "Pham Khu Vuc Quan 7",
      pointBalance: 160,
      regionKey: "quan7",
      role: "REGIONAL_LEAD",
      telegramId: 900005,
      totalXp: 190,
      username: "regional_lead_q7",
    },
    {
      fullName: "Dang Khu Vuc Can Tho",
      pointBalance: 150,
      regionKey: "canTho",
      role: "REGIONAL_LEAD",
      telegramId: 900006,
      totalXp: 175,
      username: "regional_lead_ct",
    },
    {
      fullName: "Nguyen NGV Quan 1",
      pointBalance: 120,
      regionKey: "quan1",
      role: "NGV",
      telegramId: 900007,
      totalXp: 130,
      username: "ngv_q1",
    },
    {
      fullName: "Nguyen Thanh Vien A1",
      gender: "female",
      pointBalance: 95,
      regionKey: "quan1",
      role: "MEMBER",
      telegramId: 900008,
      totalXp: 90,
      username: "member_a1",
    },
    {
      fullName: "Nguyen Thanh Vien A2",
      pointBalance: 80,
      regionKey: "quan1",
      role: "MEMBER",
      telegramId: 900009,
      totalXp: 75,
      username: "member_a2",
    },
    {
      fullName: "Vo Thanh Vien B1",
      gender: "female",
      pointBalance: 70,
      regionKey: "quan7",
      role: "MEMBER",
      telegramId: 900010,
      totalXp: 60,
      username: "member_b1",
    },
    {
      fullName: "Tran Thanh Vien C1",
      pointBalance: 55,
      regionKey: "canTho",
      role: "MEMBER",
      telegramId: 900011,
      totalXp: 50,
      username: "member_c1",
    },
    {
      fullName: "Tai Khoan Cho Duyet",
      role: "MEMBER",
      status: "PENDING",
      telegramId: 900099,
      username: "pending_member",
    },
  ];

  const users = (await UserModel.create(
    userSeeds.map((seed) => {
      const region = seed.regionKey ? regions[seed.regionKey] : null;
      const zone = seed.zoneKey
        ? zones[seed.zoneKey]
        : region
          ? [zoneSG, zoneMT].find((item) => item._id.equals(region.zoneId))
          : null;
      const totalXp = seed.totalXp ?? 0;

      return {
        avatarUrl: null,
        bio: seed.bio ?? "",
        email: seed.email ?? null,
        fullName: seed.fullName,
        gender: seed.gender ?? "male",
        googleId: null,
        level: getLevelFromXp(totalXp),
        pointBalance: seed.pointBalance ?? 0,
        regionId: region?._id ?? null,
        role: seed.role,
        status: seed.status ?? "ACTIVE",
        teamId: seed.role === "ADMIN" && !zone && !region ? null : team._id,
        telegramId: seed.telegramId ?? null,
        totalXp,
        username: seed.username,
        zoneId: zone?._id ?? null,
      };
    }),
  )) as SeededUser[];

  const userByName = new Map(users.map((user) => [user.fullName, user]));
  const teamLead = userByName.get("Tran Nhom Truong")!;
  const zoneLeadSG = userByName.get("Ho Dia Vuc Sai Gon")!;
  const zoneLeadMT = userByName.get("Mai Dia Vuc Mien Tay")!;
  const regionalLeadA = userByName.get("Le Khu Vuc Quan 1")!;
  const regionalLeadB = userByName.get("Pham Khu Vuc Quan 7")!;
  const regionalLeadC = userByName.get("Dang Khu Vuc Can Tho")!;
  const ngvA = userByName.get("Nguyen NGV Quan 1")!;
  const memberA1 = userByName.get("Nguyen Thanh Vien A1")!;
  const memberA2 = userByName.get("Nguyen Thanh Vien A2")!;
  const memberB1 = userByName.get("Vo Thanh Vien B1")!;
  const memberC1 = userByName.get("Tran Thanh Vien C1")!;

  await Promise.all([
    TeamModel.findByIdAndUpdate(team._id, {
      $set: { leadUserIds: [teamLead._id] },
    }),
    ZoneModel.findByIdAndUpdate(zoneSG._id, {
      $set: { leadUserIds: [zoneLeadSG._id] },
    }),
    ZoneModel.findByIdAndUpdate(zoneMT._id, {
      $set: { leadUserIds: [zoneLeadMT._id] },
    }),
    RegionModel.findByIdAndUpdate(regionA._id, {
      $set: { leadUserIds: [regionalLeadA._id] },
    }),
    RegionModel.findByIdAndUpdate(regionB._id, {
      $set: { leadUserIds: [regionalLeadB._id] },
    }),
    RegionModel.findByIdAndUpdate(regionC._id, {
      $set: { leadUserIds: [regionalLeadC._id] },
    }),
  ]);

  const [dailyTeamTask, weeklyZoneTask, monthlyRegionTask, countTotalTask] =
    (await TaskModel.create([
      {
        completionMessage: "Da hoan thanh diem danh.",
        createdBy: teamLead._id,
        deadlineTime: "21:00",
        description: "Diem danh moi ngay cho thanh vien va NGV trong team.",
        expReward: 10,
        lateWindowDays: 7,
        pointReward: 10,
        scheduleType: "EVERY_DAY",
        scope: "TEAM",
        sortOrder: 10,
        submissionMessage: "Da diem danh hom nay.",
        targetRoles: ["NGV", "MEMBER"],
        taskType: "DAILY_PER_MEMBER",
        teamId: team._id,
        title: "Diem danh hang ngay",
      },
      {
        completionMessage: "Da hoan thanh bao cao.",
        createdBy: zoneLeadSG._id,
        deadlineTime: "20:30",
        description: "Bao cao sinh hoat cho Dia Vuc Sai Gon vao thu 2, 4, 6.",
        expReward: 15,
        lateWindowDays: 5,
        pointReward: 12,
        scheduleType: "WEEKLY",
        scheduledWeekdays: [1, 3, 5],
        scope: "ZONE",
        sortOrder: 20,
        submissionMessage: "Da gui bao cao sinh hoat.",
        targetRoles: ["REGIONAL_LEAD", "NGV", "MEMBER"],
        taskType: "DAILY_PER_MEMBER",
        teamId: team._id,
        title: "Bao cao sinh hoat Dia Vuc",
        zoneId: zoneSG._id,
      },
      {
        completionMessage: "Da cap nhat muc tieu thang.",
        createdBy: regionalLeadA._id,
        deadlineTime: "22:00",
        description: "Muc tieu cham soc trong thang cho Khu vuc Quan 1.",
        expReward: 20,
        lateWindowDays: 14,
        pointReward: 18,
        scheduleType: "EVERY_DAY",
        scope: "REGION",
        sortOrder: 30,
        submissionMessage: "Da ghi nhan mot luot cham soc.",
        targetRoles: ["NGV", "MEMBER"],
        taskType: "MONTHLY_PER_MEMBER",
        teamId: team._id,
        title: "Cham soc hang thang",
        regionId: regionA._id,
        zoneId: zoneSG._id,
      },
      {
        completionMessage: "Da dat chi tieu chung.",
        createdBy: teamLead._id,
        deadlineTime: "23:00",
        description: "Chi tieu tong cua ca team trong thang.",
        expReward: 25,
        lateWindowDays: 30,
        pointReward: 25,
        scope: "TEAM",
        sortOrder: 40,
        submissionMessage: "Da ghi nhan mot dong gop.",
        targetCount: 20,
        targetRoles: ["TEAM_LEAD", "ZONE_LEAD", "REGIONAL_LEAD", "NGV", "MEMBER"],
        taskType: "COUNT_TOTAL",
        teamId: team._id,
        title: "Chi tieu dong gop chung",
      },
    ])) as SeededTask[];

  const todayKey = getTodayDateKey();
  const yearMonth = getCurrentYearMonth();

  await SubmissionModel.create([
    {
      actorUserId: memberA1._id,
      completionCount: 1,
      date: todayKey,
      subjectUserId: memberA1._id,
      taskId: dailyTeamTask._id,
    },
    {
      actorUserId: ngvA._id,
      completionCount: 1,
      date: todayKey,
      subjectUserId: ngvA._id,
      taskId: dailyTeamTask._id,
    },
    {
      actorUserId: regionalLeadA._id,
      completionCount: 2,
      date: todayKey,
      subjectUserId: memberA2._id,
      taskId: monthlyRegionTask._id,
    },
    {
      actorUserId: memberB1._id,
      completionCount: 3,
      date: todayKey,
      subjectUserId: memberB1._id,
      taskId: countTotalTask._id,
    },
    {
      actorUserId: memberC1._id,
      completionCount: 1,
      date: todayKey,
      subjectUserId: memberC1._id,
      taskId: countTotalTask._id,
    },
  ]);

  await Promise.all([
    MonthlyGoalModel.create([
      {
        taskId: monthlyRegionTask._id,
        targetCount: 8,
        userId: memberA1._id,
        yearMonth,
      },
      {
        taskId: monthlyRegionTask._id,
        targetCount: 10,
        userId: memberA2._id,
        yearMonth,
      },
    ]),
    TaskReminderPreferenceModel.create([
      {
        enabled: true,
        reminderTime: "19:30",
        taskId: dailyTeamTask._id,
        userId: memberA1._id,
      },
      {
        enabled: true,
        reminderTime: "18:45",
        taskId: weeklyZoneTask._id,
        userId: regionalLeadA._id,
      },
    ]),
    XpTransactionModel.create([
      {
        amount: 10,
        description: "Seed reward: Diem danh hang ngay",
        source: "task_completion",
        sourceId: dailyTeamTask._id,
        userId: memberA1._id,
      },
      {
        amount: 10,
        description: "Seed reward: Diem danh hang ngay",
        source: "task_completion",
        sourceId: dailyTeamTask._id,
        userId: ngvA._id,
      },
      {
        amount: 40,
        description: "Seed reward: Cham soc hang thang",
        source: "task_completion",
        sourceId: monthlyRegionTask._id,
        userId: memberA2._id,
      },
    ]),
    PointTransactionModel.create([
      {
        amount: 10,
        description: "Seed reward: Diem danh hang ngay",
        source: "task_reward",
        sourceId: dailyTeamTask._id,
        userId: memberA1._id,
      },
      {
        amount: 10,
        description: "Seed reward: Diem danh hang ngay",
        source: "task_reward",
        sourceId: dailyTeamTask._id,
        userId: ngvA._id,
      },
      {
        amount: 36,
        description: "Seed reward: Cham soc hang thang",
        source: "task_reward",
        sourceId: monthlyRegionTask._id,
        userId: memberA2._id,
      },
    ]),
    TelegramPendingGroupModel.create({
      chatId: -100900009999,
      title: "Ubuntu - Nhom cho gan lien ket",
      type: "supergroup",
    }),
  ]);

  const cosmeticSeed = await seedCosmetics();

  console.log(
    `Seed completed. Users: ${users.length}, tasks: 4, cosmetics: ${cosmeticSeed.created} created, ${cosmeticSeed.updated} updated, ${cosmeticSeed.total} total.`,
  );
  console.table(
    users.map((user) => ({
      name: user.fullName,
      role: user.role,
      status: user.status,
      telegramId: user.telegramId,
      username: user.username,
    })),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
