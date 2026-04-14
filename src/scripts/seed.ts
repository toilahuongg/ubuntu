import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongoose";
import {
  AuditLogModel,
  RegionModel,
  ReminderLogModel,
  SubmissionModel,
  TaskModel,
  TeamModel,
  UserModel,
  ZoneModel,
} from "@/lib/models";

async function main() {
  await connectToDatabase();

  await Promise.all([
    AuditLogModel.deleteMany({}),
    ReminderLogModel.deleteMany({}),
    SubmissionModel.deleteMany({}),
    TaskModel.deleteMany({}),
    UserModel.deleteMany({}),
    RegionModel.deleteMany({}),
    ZoneModel.deleteMany({}),
    TeamModel.deleteMany({}),
  ]);

  const team = await TeamModel.create({
    code: "TEAM-MIEN-NAM",
    name: "Team Mien Nam",
  });

  const [zoneSG, zoneMT] = await ZoneModel.create([
    { code: "DV-SG", name: "Dia Vuc Sai Gon", teamId: team._id },
    { code: "DV-MT", name: "Dia Vuc Mien Tay", teamId: team._id },
  ]);

  const [regionA, regionB, regionC] = await RegionModel.create([
    {
      code: "SG-01",
      name: "Khu vuc Quan 1",
      teamId: team._id,
      zoneId: zoneSG._id,
    },
    {
      code: "SG-02",
      name: "Khu vuc Quan 7",
      teamId: team._id,
      zoneId: zoneSG._id,
    },
    {
      code: "CT-01",
      name: "Khu vuc Can Tho",
      teamId: team._id,
      zoneId: zoneMT._id,
    },
  ]);

  const memberSeeds = [
    { fullName: "Thanh Vien 01", region: regionA, zone: zoneSG },
    { fullName: "Thanh Vien 02", region: regionA, zone: zoneSG },
    { fullName: "Thanh Vien 03", region: regionA, zone: zoneSG },
    { fullName: "Thanh Vien 04", region: regionB, zone: zoneSG },
    { fullName: "Thanh Vien 05", region: regionB, zone: zoneSG },
    { fullName: "Thanh Vien 06", region: regionB, zone: zoneSG },
    { fullName: "Thanh Vien 07", region: regionC, zone: zoneMT },
    { fullName: "Thanh Vien 08", region: regionC, zone: zoneMT },
    { fullName: "Thanh Vien 09", region: regionC, zone: zoneMT },
    { fullName: "Thanh Vien 10", region: regionC, zone: zoneMT },
  ];

  const members = await UserModel.create(
    memberSeeds.map((seed, index) => ({
      fullName: seed.fullName,
      regionId: seed.region._id,
      role: "MEMBER",
      status: "ACTIVE",
      teamId: team._id,
      telegramId: 900001 + index,
      username: `member_${String(index + 1).padStart(2, "0")}`,
      zoneId: seed.zone._id,
    })),
  );

  console.log("Seed completed.");
  console.table(
    (members as Array<{ fullName: string; role: string; telegramId: number | null; username: string | null }>).map(
      (m) => ({
        name: m.fullName,
        role: m.role,
        telegramId: m.telegramId,
        username: m.username,
      }),
    ),
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
