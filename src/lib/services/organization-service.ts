import "server-only";

import type { Role, SerializedUser, SessionUser } from "@/lib/domain";
import { connectToDatabase } from "@/lib/mongoose";
import {
  RegionModel,
  type RegionRecord,
  TeamModel,
  type TeamRecord,
  UserModel,
  type UserRecord,
} from "@/lib/models";
import { stringifyId, toObjectId } from "@/lib/utils/ids";

type SaveUserInput = {
  fullName: string;
  regionId?: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  teamId?: string;
  telegramId?: number;
  userId?: string;
  username?: string;
};

type TeamSummary = {
  code: string;
  id: string;
  leadUserIds: string[];
  memberCount: number;
  name: string;
};

type RegionSummary = {
  code: string;
  id: string;
  leadUserIds: string[];
  memberCount: number;
  name: string;
  teamId: string;
  teamName?: string;
};

export type AdminSnapshot = {
  regions: RegionSummary[];
  teams: TeamSummary[];
  users: SerializedUser[];
};

function serializeUser(record: UserRecord): SerializedUser {
  return {
    createdAt: record.createdAt?.toISOString(),
    fullName: record.fullName,
    id: record._id.toString(),
    regionId: stringifyId(record.regionId),
    role: record.role,
    status: record.status,
    teamId: stringifyId(record.teamId),
    telegramId: record.telegramId,
    updatedAt: record.updatedAt?.toISOString(),
    username: record.username,
  };
}

async function syncLeadAssignments(user: SerializedUser) {
  await TeamModel.updateMany(
    { leadUserIds: toObjectId(user.id) },
    { $pull: { leadUserIds: toObjectId(user.id) } },
  );
  await RegionModel.updateMany(
    { leadUserIds: toObjectId(user.id) },
    { $pull: { leadUserIds: toObjectId(user.id) } },
  );

  if (user.role === "TEAM_LEAD" && user.teamId) {
    await TeamModel.findByIdAndUpdate(user.teamId, {
      $addToSet: { leadUserIds: toObjectId(user.id) },
    });
  }

  if (user.role === "REGIONAL_LEAD" && user.regionId) {
    await RegionModel.findByIdAndUpdate(user.regionId, {
      $addToSet: { leadUserIds: toObjectId(user.id) },
    });
  }
}

export async function getAdminSnapshot() {
  await connectToDatabase();

  const [teams, regions, users] = await Promise.all([
    TeamModel.find().sort({ name: 1 }).lean(),
    RegionModel.find().sort({ name: 1 }).lean(),
    UserModel.find().sort({ createdAt: -1 }).lean(),
  ]);

  const typedTeams = teams as TeamRecord[];
  const typedRegions = regions as RegionRecord[];
  const typedUsers = users as UserRecord[];

  const teamCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();

  for (const user of typedUsers) {
    const teamId = stringifyId(user.teamId);
    const regionId = stringifyId(user.regionId);

    if (teamId) {
      teamCounts.set(teamId, (teamCounts.get(teamId) || 0) + 1);
    }

    if (regionId) {
      regionCounts.set(regionId, (regionCounts.get(regionId) || 0) + 1);
    }
  }

  const teamMap = new Map(typedTeams.map((team) => [team._id.toString(), team]));

  return {
    regions: typedRegions.map((region) => ({
      code: region.code,
      id: region._id.toString(),
      leadUserIds: region.leadUserIds.map((value) => value.toString()),
      memberCount: regionCounts.get(region._id.toString()) || 0,
      name: region.name,
      teamId: region.teamId.toString(),
      teamName: teamMap.get(region.teamId.toString())?.name,
    })),
    teams: typedTeams.map((team) => ({
      code: team.code,
      id: team._id.toString(),
      leadUserIds: team.leadUserIds.map((value) => value.toString()),
      memberCount: teamCounts.get(team._id.toString()) || 0,
      name: team.name,
    })),
    users: typedUsers.map(serializeUser),
  } satisfies AdminSnapshot;
}

export async function getUserById(userId: string) {
  await connectToDatabase();
  const user = (await UserModel.findById(userId).lean()) as UserRecord | null;
  return user ? serializeUser(user) : null;
}

export async function getUserByTelegramId(telegramId: number) {
  await connectToDatabase();
  const user = (await UserModel.findOne({ telegramId }).lean()) as UserRecord | null;
  return user ? serializeUser(user) : null;
}

export async function markUserLogin(userId: string) {
  await connectToDatabase();
  await UserModel.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
}

export async function listVisibleUsersForActor(actor: SessionUser) {
  await connectToDatabase();

  if (actor.role === "ADMIN") {
    const users = (await UserModel.find({ status: "ACTIVE" })
      .sort({ fullName: 1 })
      .lean()) as UserRecord[];

    return users.map(serializeUser);
  }

  if (actor.role === "TEAM_LEAD" && actor.teamId) {
    const users = (await UserModel.find({
      status: "ACTIVE",
      teamId: toObjectId(actor.teamId),
    })
      .sort({ role: 1, fullName: 1 })
      .lean()) as UserRecord[];

    return users.map(serializeUser);
  }

  if (actor.role === "REGIONAL_LEAD" && actor.regionId) {
    const users = (await UserModel.find({
      regionId: toObjectId(actor.regionId),
      status: "ACTIVE",
    })
      .sort({ role: 1, fullName: 1 })
      .lean()) as UserRecord[];

    return users.map(serializeUser);
  }

  const self = await getUserById(actor.id);
  return self ? [self] : [];
}

export async function listDevLoginUsers() {
  await connectToDatabase();
  const users = (await UserModel.find({ status: "ACTIVE" })
    .sort({ role: 1, fullName: 1 })
    .lean()) as UserRecord[];
  return users.map(serializeUser);
}

export async function createTeam(name: string, code: string) {
  await connectToDatabase();

  const team = await TeamModel.create({
    code,
    name,
  });

  return team._id.toString();
}

export async function createRegion(input: {
  code: string;
  name: string;
  teamId: string;
}) {
  await connectToDatabase();

  const region = await RegionModel.create({
    code: input.code,
    name: input.name,
    teamId: toObjectId(input.teamId),
  });

  return region._id.toString();
}

export async function saveUser(input: SaveUserInput) {
  await connectToDatabase();

  let normalizedTeamId = input.teamId;
  let normalizedRegionId = input.regionId;

  if (input.regionId) {
    const region = (await RegionModel.findById(input.regionId).lean()) as RegionRecord | null;

    if (!region) {
      throw new Error("Khu vực không tồn tại.");
    }

    normalizedTeamId = region.teamId.toString();
    normalizedRegionId = region._id.toString();
  }

  if ((input.role === "TEAM_LEAD" || input.role === "ADMIN") && !input.teamId) {
    normalizedRegionId = undefined;
  }

  const payload = {
    fullName: input.fullName,
    regionId: normalizedRegionId ? toObjectId(normalizedRegionId) : null,
    role: input.role,
    status: input.status,
    teamId: normalizedTeamId ? toObjectId(normalizedTeamId) : null,
    telegramId: input.telegramId ?? null,
    username: input.username?.trim() || null,
  };

  const user = input.userId
    ? await UserModel.findByIdAndUpdate(input.userId, payload, { new: true })
    : await UserModel.create(payload);

  if (!user) {
    throw new Error("Không thể lưu người dùng.");
  }

  const serialized = serializeUser(user.toObject() as UserRecord);
  await syncLeadAssignments(serialized);

  return serialized;
}

export async function getRegionById(regionId: string) {
  await connectToDatabase();
  return (await RegionModel.findById(regionId).lean()) as RegionRecord | null;
}

export async function listTeams() {
  await connectToDatabase();
  return (await TeamModel.find().sort({ name: 1 }).lean()) as TeamRecord[];
}

export async function listRegions(teamId?: string) {
  await connectToDatabase();
  const query = teamId ? { teamId: toObjectId(teamId) } : {};
  return (await RegionModel.find(query).sort({ name: 1 }).lean()) as RegionRecord[];
}
