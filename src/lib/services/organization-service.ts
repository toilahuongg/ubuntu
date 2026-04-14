import "server-only";

import type { Role, SerializedUser, SessionUser, UserStatus } from "@/lib/domain";
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
  gender?: string;
  regionId?: string;
  role: Role;
  status: UserStatus;
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
    bio: (record as UserRecord & { bio?: string }).bio ?? "",
    createdAt: record.createdAt?.toISOString(),
    fullName: record.fullName,
    gender: (record as UserRecord & { gender?: string }).gender as SerializedUser["gender"] ?? "male",
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

  if (actor.role === "TEAM_LEAD" && !actor.teamId) {
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

    const result = users.map(serializeUser);
    if (!result.some((u) => u.id === actor.id)) {
      const self = await getUserById(actor.id);
      if (self) result.unshift(self);
    }
    return result;
  }

  if (actor.role === "REGIONAL_LEAD" && actor.regionId) {
    const users = (await UserModel.find({
      regionId: toObjectId(actor.regionId),
      status: "ACTIVE",
    })
      .sort({ role: 1, fullName: 1 })
      .lean()) as UserRecord[];

    const result = users.map(serializeUser);
    if (!result.some((u) => u.id === actor.id)) {
      const self = await getUserById(actor.id);
      if (self) result.unshift(self);
    }
    return result;
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

  if (input.role === "TEAM_LEAD" && !input.teamId) {
    normalizedRegionId = undefined;
  }

  const payload = {
    fullName: input.fullName,
    gender: input.gender === "female" ? "female" : "male",
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

export async function createPendingUser(input: {
  fullName: string;
  telegramId: number;
  username?: string;
}) {
  await connectToDatabase();

  const user = await UserModel.create({
    fullName: input.fullName,
    role: "MEMBER",
    status: "PENDING",
    telegramId: input.telegramId,
    username: input.username?.trim() || null,
  });

  return serializeUser(user.toObject() as UserRecord);
}

export async function updateUserRegion(userId: string, regionId: string | null) {
  await connectToDatabase();

  let teamId: string | null = null;

  if (regionId) {
    const region = (await RegionModel.findById(regionId).lean()) as RegionRecord | null;
    if (!region) {
      throw new Error("Khu vực không tồn tại.");
    }
    teamId = region.teamId.toString();
  }

  const user = await UserModel.findByIdAndUpdate(
    userId,
    {
      regionId: regionId ? toObjectId(regionId) : null,
      teamId: teamId ? toObjectId(teamId) : null,
    },
    { new: true },
  );

  if (!user) {
    throw new Error("Không tìm thấy người dùng.");
  }

  return serializeUser(user.toObject() as UserRecord);
}

export async function approveUser(userId: string) {
  await connectToDatabase();

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { status: "ACTIVE" },
    { new: true },
  );

  if (!user) {
    throw new Error("Không tìm thấy người dùng.");
  }

  return serializeUser(user.toObject() as UserRecord);
}

export type TeamLeadSnapshot = {
  regions: RegionSummary[];
  members: SerializedUser[];
};

export async function getTeamLeadSnapshot(teamId: string): Promise<TeamLeadSnapshot> {
  await connectToDatabase();

  const [regions, users] = await Promise.all([
    RegionModel.find({ teamId: toObjectId(teamId) }).sort({ name: 1 }).lean() as Promise<RegionRecord[]>,
    UserModel.find({ teamId: toObjectId(teamId), status: "ACTIVE" }).sort({ role: 1, fullName: 1 }).lean() as Promise<UserRecord[]>,
  ]);

  const regionCounts = new Map<string, number>();
  for (const user of users) {
    const regionId = stringifyId(user.regionId);
    if (regionId) {
      regionCounts.set(regionId, (regionCounts.get(regionId) || 0) + 1);
    }
  }

  return {
    regions: regions.map((region) => ({
      code: region.code,
      id: region._id.toString(),
      leadUserIds: region.leadUserIds.map((v) => v.toString()),
      memberCount: regionCounts.get(region._id.toString()) || 0,
      name: region.name,
      teamId: region.teamId.toString(),
    })),
    members: users.map(serializeUser),
  };
}

export async function assignRegionalLead(
  actorTeamId: string,
  userId: string,
  regionId: string,
) {
  await connectToDatabase();

  const region = (await RegionModel.findById(regionId).lean()) as RegionRecord | null;
  if (!region || region.teamId.toString() !== actorTeamId) {
    throw new Error("Khu vực không thuộc nhóm của bạn.");
  }

  const user = (await UserModel.findById(userId).lean()) as UserRecord | null;
  if (!user || stringifyId(user.teamId) !== actorTeamId) {
    throw new Error("Thành viên không thuộc nhóm của bạn.");
  }

  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    {
      regionId: toObjectId(regionId),
      role: "REGIONAL_LEAD",
    },
    { new: true },
  );

  if (!updatedUser) {
    throw new Error("Không thể cập nhật người dùng.");
  }

  const serialized = serializeUser(updatedUser.toObject() as UserRecord);
  await syncLeadAssignments(serialized);

  return serialized;
}

export async function updateUserProfile(
  userId: string,
  input: { fullName?: string; gender?: string; bio?: string },
) {
  await connectToDatabase();

  const update: Record<string, unknown> = {};

  if (typeof input.fullName === "string") {
    const trimmed = input.fullName.trim();
    if (!trimmed) throw new Error("Biệt danh không được để trống.");
    if (trimmed.length > 60) throw new Error("Biệt danh tối đa 60 ký tự.");
    update.fullName = trimmed;
  }

  if (typeof input.gender === "string") {
    update.gender = input.gender === "female" ? "female" : "male";
  }

  if (typeof input.bio === "string") {
    const trimmed = input.bio.trim();
    if (trimmed.length > 280) throw new Error("Tiểu sử tối đa 280 ký tự.");
    update.bio = trimmed;
  }

  const user = await UserModel.findByIdAndUpdate(userId, update, { new: true });

  if (!user) {
    throw new Error("Không tìm thấy người dùng.");
  }

  return serializeUser(user.toObject() as UserRecord);
}

export async function listPendingUsers() {
  await connectToDatabase();
  const users = (await UserModel.find({ status: "PENDING" })
    .sort({ createdAt: -1 })
    .lean()) as UserRecord[];
  return users.map(serializeUser);
}
