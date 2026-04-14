import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongoose";
import {
  AuditLogModel,
  RegionModel,
  SubmissionModel,
  TaskOccurrenceModel,
  TaskTemplateModel,
  TeamModel,
  UserModel,
} from "@/lib/models";

async function main() {
  await connectToDatabase();

  await Promise.all([
    AuditLogModel.deleteMany({}),
    SubmissionModel.deleteMany({}),
    TaskOccurrenceModel.deleteMany({}),
    TaskTemplateModel.deleteMany({}),
    UserModel.deleteMany({}),
    RegionModel.deleteMany({}),
    TeamModel.deleteMany({}),
  ]);

  const team = await TeamModel.create({
    code: "TEAM-MIEN-NAM",
    name: "Team Mien Nam",
  });

  const [regionA, regionB] = await RegionModel.create([
    {
      code: "SG-01",
      name: "Khu vuc Sai Gon",
      teamId: team._id,
    },
    {
      code: "CT-01",
      name: "Khu vuc Can Tho",
      teamId: team._id,
    },
  ]);

  const [teamLead, regionalLeadA, regionalLeadB, memberA1, memberA2, memberB1] =
    await UserModel.create([
      {
        fullName: "Tran Nhom Truong",
        role: "TEAM_LEAD",
        status: "ACTIVE",
        teamId: team._id,
        telegramId: 900002,
        username: "team_lead_ops",
      },
      {
        fullName: "Le Khu Vuc A",
        regionId: regionA._id,
        role: "REGIONAL_LEAD",
        status: "ACTIVE",
        teamId: team._id,
        telegramId: 900003,
        username: "regional_a",
      },
      {
        fullName: "Pham Khu Vuc B",
        regionId: regionB._id,
        role: "REGIONAL_LEAD",
        status: "ACTIVE",
        teamId: team._id,
        telegramId: 900004,
        username: "regional_b",
      },
      {
        fullName: "Nguyen Thanh Vien A1",
        regionId: regionA._id,
        role: "MEMBER",
        status: "ACTIVE",
        teamId: team._id,
        telegramId: 900005,
        username: "member_a1",
      },
      {
        fullName: "Nguyen Thanh Vien A2",
        regionId: regionA._id,
        role: "MEMBER",
        status: "ACTIVE",
        teamId: team._id,
        telegramId: 900006,
        username: "member_a2",
      },
      {
        fullName: "Vo Thanh Vien B1",
        regionId: regionB._id,
        role: "MEMBER",
        status: "ACTIVE",
        teamId: team._id,
        telegramId: 900007,
        username: "member_b1",
      },
    ]);

  await Promise.all([
    TeamModel.findByIdAndUpdate(team._id, {
      $addToSet: { leadUserIds: teamLead._id },
    }),
    RegionModel.findByIdAndUpdate(regionA._id, {
      $addToSet: { leadUserIds: regionalLeadA._id },
    }),
    RegionModel.findByIdAndUpdate(regionB._id, {
      $addToSet: { leadUserIds: regionalLeadB._id },
    }),
  ]);

  await TaskTemplateModel.create([
    {
      createdBy: teamLead._id,
      deadlineTime: "11:30",
      description: "Tong hop cac diem ban trong buoi sang va ghi chu bat thuong.",
      expReward: 10,
      isActive: true,
      teamId: team._id,
      title: "Bao cao doanh so buoi sang",
    },
    {
      createdBy: teamLead._id,
      deadlineTime: "17:30",
      description: "Check tinh trang diem ban cuoi ngay va muc hoan thanh chi tieu.",
      expReward: 15,
      isActive: true,
      teamId: team._id,
      title: "Check list cuoi ngay",
    },
  ]);

  console.log("Seed completed.");
  console.table([
    { name: teamLead.fullName, role: teamLead.role, telegramId: teamLead.telegramId },
    { name: regionalLeadA.fullName, role: regionalLeadA.role, telegramId: regionalLeadA.telegramId },
    { name: regionalLeadB.fullName, role: regionalLeadB.role, telegramId: regionalLeadB.telegramId },
    { name: memberA1.fullName, role: memberA1.role, telegramId: memberA1.telegramId },
    { name: memberA2.fullName, role: memberA2.role, telegramId: memberA2.telegramId },
    { name: memberB1.fullName, role: memberB1.role, telegramId: memberB1.telegramId },
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
