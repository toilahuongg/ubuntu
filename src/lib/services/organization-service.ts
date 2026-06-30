import "server-only";

import type { Role, SerializedUser, SessionUser, UserStatus } from "@/lib/domain";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  canAccessManagement,
  canAccessRegionStructure,
  canAccessUserManagement,
  canReviewPendingUser,
} from "@/lib/permissions";
import { connectToDatabase } from "@/lib/mongoose";
import {
  RegionModel,
  type RegionRecord,
  TeamModel,
  type TeamRecord,
  UserModel,
  type UserRecord,
  ZoneModel,
  type ZoneRecord,
} from "@/lib/models";
import { stringifyId, toObjectId } from "@/lib/utils/ids";

type SaveUserInput = {
  fullName: string;
  gender?: string;
  regionId?: string;
  role: Role;
  status: UserStatus;
  teamId?: string;
  zoneId?: string;
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

type ZoneSummary = {
  code: string;
  id: string;
  leadUserIds: string[];
  memberCount: number;
  name: string;
  regionCount: number;
  teamId: string;
  teamName?: string;
};

type RegionSummary = {
  code: string;
  id: string;
  leadUserIds: string[];
  memberCount: number;
  name: string;
  teamId: string;
  teamName?: string;
  zoneId: string;
  zoneName?: string;
};

export type AdminSnapshot = {
  regions: RegionSummary[];
  teams: TeamSummary[];
  users: SerializedUser[];
  zones: ZoneSummary[];
};

type SnapshotFilters = {
  regionFilter: Record<string, unknown>;
  teamFilter: Record<string, unknown>;
  userFilter: Record<string, unknown>;
  zoneFilter: Record<string, unknown>;
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
    googleId: (record as UserRecord & { googleId?: string | null }).googleId ?? null,
    email: (record as UserRecord & { email?: string | null }).email ?? null,
    updatedAt: record.updatedAt?.toISOString(),
    username: record.username,
    zoneId: stringifyId((record as UserRecord & { zoneId?: unknown }).zoneId),
  };
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

async function assertTeamZonePair(teamId: string, zoneId: string) {
  const [team, zone] = await Promise.all([
    TeamModel.findById(teamId).lean() as Promise<TeamRecord | null>,
    ZoneModel.findById(zoneId).lean() as Promise<ZoneRecord | null>,
  ]);

  if (!team) throw new Error("Nhóm không tồn tại.");
  if (!zone) throw new Error("Địa Vực không tồn tại.");
  if (zone.teamId.toString() !== team._id.toString()) {
    throw new Error("Địa Vực không thuộc Nhóm đã chọn.");
  }

  return { team, zone };
}

async function syncLeadAssignments(user: SerializedUser) {
  const userObjectId = toObjectId(user.id);

  await Promise.all([
    TeamModel.updateMany(
      { leadUserIds: userObjectId },
      { $pull: { leadUserIds: userObjectId } },
    ),
    ZoneModel.updateMany(
      { leadUserIds: userObjectId },
      { $pull: { leadUserIds: userObjectId } },
    ),
    RegionModel.updateMany(
      { leadUserIds: userObjectId },
      { $pull: { leadUserIds: userObjectId } },
    ),
  ]);

  if (user.role === "TEAM_LEAD" && user.teamId) {
    await TeamModel.findByIdAndUpdate(user.teamId, {
      $addToSet: { leadUserIds: userObjectId },
    });
  }

  if (user.role === "ZONE_LEAD" && user.zoneId) {
    await ZoneModel.findByIdAndUpdate(user.zoneId, {
      $addToSet: { leadUserIds: userObjectId },
    });
  }

  if (user.role === "REGIONAL_LEAD" && user.regionId) {
    await RegionModel.findByIdAndUpdate(user.regionId, {
      $addToSet: { leadUserIds: userObjectId },
    });
  }
}

async function buildSnapshot(filters: SnapshotFilters): Promise<AdminSnapshot> {
  const [teams, zones, regions, users] = await Promise.all([
    TeamModel.find(filters.teamFilter).sort({ name: 1 }).lean() as Promise<TeamRecord[]>,
    ZoneModel.find(filters.zoneFilter).sort({ name: 1 }).lean() as Promise<ZoneRecord[]>,
    RegionModel.find(filters.regionFilter).sort({ name: 1 }).lean() as Promise<RegionRecord[]>,
    UserModel.find(filters.userFilter).sort({ createdAt: -1 }).lean() as Promise<UserRecord[]>,
  ]);

  const teamCounts = new Map<string, number>();
  const zoneCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();
  const zoneRegionCounts = new Map<string, number>();

  for (const user of users) {
    const teamId = stringifyId(user.teamId);
    const zoneId = stringifyId((user as UserRecord & { zoneId?: unknown }).zoneId);
    const regionId = stringifyId(user.regionId);

    if (teamId) teamCounts.set(teamId, (teamCounts.get(teamId) || 0) + 1);
    if (zoneId) zoneCounts.set(zoneId, (zoneCounts.get(zoneId) || 0) + 1);
    if (regionId) regionCounts.set(regionId, (regionCounts.get(regionId) || 0) + 1);
  }

  for (const region of regions) {
    const zoneId = (region as RegionRecord & { zoneId?: unknown }).zoneId
      ? (region as RegionRecord & { zoneId: { toString(): string } }).zoneId.toString()
      : null;
    if (zoneId) {
      zoneRegionCounts.set(zoneId, (zoneRegionCounts.get(zoneId) || 0) + 1);
    }
  }

  const teamMap = new Map(teams.map((team) => [team._id.toString(), team]));
  const zoneMap = new Map(zones.map((zone) => [zone._id.toString(), zone]));

  return {
    regions: regions.map((region) => {
      const zoneIdRaw = (region as RegionRecord & { zoneId?: unknown }).zoneId;
      const zoneId = zoneIdRaw
        ? (zoneIdRaw as { toString(): string }).toString()
        : "";
      const teamIdRaw = region.teamId;
      const teamId = teamIdRaw ? teamIdRaw.toString() : "";
      return {
        code: region.code,
        id: region._id.toString(),
        leadUserIds: region.leadUserIds.map((value) => value.toString()),
        memberCount: regionCounts.get(region._id.toString()) || 0,
        name: region.name,
        teamId,
        teamName: teamId ? teamMap.get(teamId)?.name : undefined,
        zoneId,
        zoneName: zoneId ? zoneMap.get(zoneId)?.name : undefined,
      };
    }),
    teams: teams.map((team) => ({
      code: team.code,
      id: team._id.toString(),
      leadUserIds: team.leadUserIds.map((value) => value.toString()),
      memberCount: teamCounts.get(team._id.toString()) || 0,
      name: team.name,
    })),
    users: users.map(serializeUser),
    zones: zones.map((zone) => ({
      code: zone.code,
      id: zone._id.toString(),
      leadUserIds: zone.leadUserIds.map((value) => value.toString()),
      memberCount: zoneCounts.get(zone._id.toString()) || 0,
      name: zone.name,
      regionCount: zoneRegionCounts.get(zone._id.toString()) || 0,
      teamId: zone.teamId.toString(),
      teamName: teamMap.get(zone.teamId.toString())?.name,
    })),
  };
}

function getManagementSnapshotFilters(actor: SessionUser): SnapshotFilters {
  if (actor.role === "TEAM_LEAD" && actor.teamId) {
    const teamId = toObjectId(actor.teamId);
    return {
      regionFilter: { teamId },
      teamFilter: { _id: teamId },
      userFilter: { teamId },
      zoneFilter: { teamId },
    };
  }

  if (actor.role === "ZONE_LEAD" && actor.zoneId) {
    const zoneId = toObjectId(actor.zoneId);
    return {
      regionFilter: { zoneId },
      teamFilter: actor.teamId ? { _id: toObjectId(actor.teamId) } : { _id: null },
      userFilter: { zoneId },
      zoneFilter: { _id: zoneId },
    };
  }

  return {
    regionFilter: {},
    teamFilter: {},
    userFilter: {},
    zoneFilter: {},
  };
}

function getScopedSnapshotFilters(actor: SessionUser): SnapshotFilters {
  if (actor.role === "TEAM_LEAD" && actor.teamId) {
    return getManagementSnapshotFilters(actor);
  }

  if (actor.role === "ZONE_LEAD" && actor.zoneId) {
    const zoneId = toObjectId(actor.zoneId);
    return {
      regionFilter: { zoneId },
      teamFilter: actor.teamId ? { _id: toObjectId(actor.teamId) } : { _id: null },
      userFilter: { zoneId },
      zoneFilter: { _id: zoneId },
    };
  }

  if (actor.role === "REGIONAL_LEAD" && actor.regionId) {
    const regionId = toObjectId(actor.regionId);
    return {
      regionFilter: { _id: regionId },
      teamFilter: actor.teamId ? { _id: toObjectId(actor.teamId) } : { _id: null },
      userFilter: { regionId },
      zoneFilter: actor.zoneId ? { _id: toObjectId(actor.zoneId) } : { _id: null },
    };
  }

  return getManagementSnapshotFilters(actor);
}

function getUserManagementSnapshotFilters(actor: SessionUser): SnapshotFilters {
  return getScopedSnapshotFilters(actor);
}

export async function getAdminSnapshot(actor: SessionUser): Promise<AdminSnapshot> {
  if (!canAccessManagement(actor)) {
    throw new Error("Bạn không có quyền xem dữ liệu quản trị.");
  }

  await connectToDatabase();
  return buildSnapshot(getManagementSnapshotFilters(actor));
}

export async function getUserManagementSnapshot(
  actor: SessionUser,
): Promise<AdminSnapshot> {
  if (!canAccessUserManagement(actor)) {
    throw new Error("Bạn không có quyền xem danh sách người dùng.");
  }

  await connectToDatabase();
  return buildSnapshot(getUserManagementSnapshotFilters(actor));
}

export async function getStructureSnapshot(
  actor: SessionUser,
): Promise<AdminSnapshot> {
  if (!canAccessRegionStructure(actor)) {
    throw new Error("Bạn không có quyền xem cấu trúc tổ chức.");
  }

  await connectToDatabase();
  return buildSnapshot(getScopedSnapshotFilters(actor));
}

export async function getUserById(userId: string) {
  await connectToDatabase();
  const user = (await UserModel.findById(userId).lean()) as UserRecord | null;
  return user ? serializeUser(user) : null;
}

export async function getUserOrgContext(user: {
  teamId?: string | null;
  zoneId?: string | null;
  regionId?: string | null;
}) {
  await connectToDatabase();
  const [team, zone, region] = await Promise.all([
    user.teamId
      ? (TeamModel.findById(user.teamId).lean() as Promise<TeamRecord | null>)
      : null,
    user.zoneId
      ? (ZoneModel.findById(user.zoneId).lean() as Promise<ZoneRecord | null>)
      : null,
    user.regionId
      ? (RegionModel.findById(user.regionId).lean() as Promise<RegionRecord | null>)
      : null,
  ]);
  return {
    team: team ? { id: stringifyId(team._id), name: team.name, code: team.code } : null,
    zone: zone ? { id: stringifyId(zone._id), name: zone.name, code: zone.code } : null,
    region: region
      ? { id: stringifyId(region._id), name: region.name, code: region.code }
      : null,
  };
}

export async function getUserByTelegramId(telegramId: number) {
  await connectToDatabase();
  const user = (await UserModel.findOne({ telegramId }).lean()) as UserRecord | null;
  return user ? serializeUser(user) : null;
}

export async function getUserByGoogleId(googleId: string) {
  await connectToDatabase();
  const user = (await UserModel.findOne({ googleId }).lean()) as UserRecord | null;
  return user ? serializeUser(user) : null;
}

export async function getUserByEmail(email: string) {
  await connectToDatabase();
  const user = (await UserModel.findOne({
    email: email.toLowerCase().trim(),
  }).lean()) as UserRecord | null;
  return user ? serializeUser(user) : null;
}

export async function getUserByUsername(username: string) {
  await connectToDatabase();
  const normalized = normalizeUsername(username);
  const user = (await UserModel.findOne({ username: normalized }).lean()) as UserRecord | null;
  return user ? serializeUser(user) : null;
}

export async function authenticateManualUser(input: {
  password: string;
  username: string;
}) {
  await connectToDatabase();
  const normalized = normalizeUsername(input.username);
  const user = (await UserModel.findOne({ username: normalized }).lean()) as
    | (UserRecord & { passwordHash?: string | null })
    | null;

  if (!user) {
    throw new Error("Tên đăng nhập hoặc mật khẩu không đúng.");
  }

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) {
    throw new Error("Tên đăng nhập hoặc mật khẩu không đúng.");
  }

  if (user.status === "INACTIVE") {
    throw new Error("Tài khoản của bạn đã bị khóa.");
  }

  const serialized = serializeUser(user);
  if (serialized.status === "ACTIVE") {
    await markUserLogin(serialized.id);
  }

  return serialized;
}

export async function linkGoogleAccount(
  userId: string,
  input: { googleId: string; email: string; avatarUrl?: string | null },
) {
  await connectToDatabase();
  const user = await UserModel.findByIdAndUpdate(
    userId,
    {
      googleId: input.googleId,
      email: input.email.toLowerCase().trim(),
      ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
    },
    { new: true },
  );
  if (!user) throw new Error("Không tìm thấy người dùng.");
  return serializeUser(user.toObject() as UserRecord);
}

export async function createPendingGoogleUser(input: {
  fullName: string;
  googleId: string;
  email: string;
  avatarUrl?: string | null;
}) {
  await connectToDatabase();
  const user = await UserModel.create({
    fullName: input.fullName,
    role: "TDM",
    status: "PENDING",
    googleId: input.googleId,
    email: input.email.toLowerCase().trim(),
    avatarUrl: input.avatarUrl ?? null,
  });
  return serializeUser(user.toObject() as UserRecord);
}

export async function createPendingManualUser(input: {
  fullName: string;
  password: string;
  teamId: string;
  username: string;
  zoneId: string;
}) {
  await connectToDatabase();

  const fullName = input.fullName.trim();
  const username = normalizeUsername(input.username);
  if (!fullName) throw new Error("Vui lòng nhập họ tên.");
  if (!username) throw new Error("Vui lòng nhập tên đăng nhập.");
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error("Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang.");
  }

  const { team, zone } = await assertTeamZonePair(input.teamId, input.zoneId);
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await UserModel.create({
      fullName,
      passwordHash,
      role: "TDM",
      status: "PENDING",
      teamId: team._id,
      username,
      zoneId: zone._id,
    });
    return serializeUser(user.toObject() as UserRecord);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new Error("Tên đăng nhập đã tồn tại.");
    }
    throw error;
  }
}

export async function completePendingUserScope(
  userId: string,
  input: { teamId: string; zoneId: string },
) {
  await connectToDatabase();
  const { team, zone } = await assertTeamZonePair(input.teamId, input.zoneId);

  const user = await UserModel.findOneAndUpdate(
    { _id: toObjectId(userId), status: "PENDING" },
    {
      role: "TDM",
      teamId: team._id,
      zoneId: zone._id,
    },
    { new: true },
  );

  if (!user) throw new Error("Không tìm thấy tài khoản chờ duyệt.");
  return serializeUser(user.toObject() as UserRecord);
}

export async function markUserLogin(userId: string) {
  await connectToDatabase();
  await UserModel.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
}

export async function listTeamMembersForViewing(
  actor: SessionUser,
): Promise<SerializedUser[]> {
  if (!actor.teamId) return [];
  await connectToDatabase();
  const users = (await UserModel.find({
    status: "ACTIVE",
    teamId: toObjectId(actor.teamId),
  })
    .sort({ role: 1, fullName: 1 })
    .lean()) as UserRecord[];
  return users.map(serializeUser);
}

export async function listVisibleUsersForActor(actor: SessionUser) {
  await connectToDatabase();

  if (actor.role === "ADMIN") {
    const users = (await UserModel.find({ status: "ACTIVE" })
      .sort({ role: 1, fullName: 1 })
      .lean()) as UserRecord[];

    const result = users.map(serializeUser);
    if (!result.some((u) => u.id === actor.id)) {
      const self = await getUserById(actor.id);
      if (self) result.unshift(self);
    }
    return result;
  }

  if (actor.role === "TEAM_LEAD") {
    if (!actor.teamId) {
      // Fail-closed: a TEAM_LEAD with no team scope should not be able to
      // see every ACTIVE user in the org. Previously this branch leaked the
      // full user list — now it falls through to the self-only default at
      // the bottom of this function.
      const self = await getUserById(actor.id);
      return self ? [self] : [];
    }

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

  if (actor.role === "ZONE_LEAD" && actor.zoneId) {
    const users = (await UserModel.find({
      status: "ACTIVE",
      zoneId: toObjectId(actor.zoneId),
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
  const team = await TeamModel.create({ code, name });
  return team._id.toString();
}

export async function updateTeam(
  teamId: string,
  input: { name: string; code: string },
) {
  await connectToDatabase();
  const team = await TeamModel.findByIdAndUpdate(
    teamId,
    { code: input.code.trim(), name: input.name.trim() },
    { new: true },
  );
  if (!team) throw new Error("Nhóm không tồn tại.");
  return team._id.toString();
}

export async function updateZone(
  zoneId: string,
  input: { name: string; code: string },
) {
  await connectToDatabase();
  const zone = await ZoneModel.findByIdAndUpdate(
    zoneId,
    { code: input.code.trim(), name: input.name.trim() },
    { new: true },
  );
  if (!zone) throw new Error("Địa Vực không tồn tại.");
  return zone._id.toString();
}

export async function updateRegion(
  regionId: string,
  input: { name: string; code: string },
) {
  await connectToDatabase();
  const region = await RegionModel.findByIdAndUpdate(
    regionId,
    { code: input.code.trim(), name: input.name.trim() },
    { new: true },
  );
  if (!region) throw new Error("Khu vực không tồn tại.");
  return region._id.toString();
}

export async function createZone(input: {
  code: string;
  name: string;
  teamId: string;
}) {
  await connectToDatabase();
  const zone = await ZoneModel.create({
    code: input.code,
    name: input.name,
    teamId: toObjectId(input.teamId),
  });
  return zone._id.toString();
}

export async function createRegion(input: {
  code: string;
  name: string;
  zoneId: string;
}) {
  await connectToDatabase();

  const zone = (await ZoneModel.findById(input.zoneId).lean()) as ZoneRecord | null;
  if (!zone) {
    throw new Error("Địa Vực không tồn tại.");
  }

  const region = await RegionModel.create({
    code: input.code,
    name: input.name,
    teamId: zone.teamId,
    zoneId: zone._id,
  });

  return region._id.toString();
}

/**
 * Resolve the user's ancestor IDs based on role and lowest-level assignment.
 * DB denormalizes teamId/zoneId/regionId for query efficiency, but the
 * caller only supplies the lowest level (per product spec).
 */
async function resolveUserHierarchy(input: {
  role: Role;
  teamId?: string;
  zoneId?: string;
  regionId?: string;
}) {
  if (input.role === "ADMIN") {
    if (!input.teamId) {
      return {
        regionId: null,
        teamId: null,
        zoneId: null,
      };
    }
    const team = (await TeamModel.findById(input.teamId).lean()) as TeamRecord | null;
    if (!team) throw new Error("Nhóm không tồn tại.");
    return {
      regionId: null,
      teamId: team._id.toString(),
      zoneId: null,
    };
  }

  if (
    input.role === "MEMBER" ||
    input.role === "TDM" ||
    input.role === "NGV" ||
    input.role === "REGIONAL_LEAD"
  ) {
    // Fail-fast: roles at or below REGION must be scoped to a region.
    // Silently returning nulls here previously created orphan users that
    // could not be found by any leader's visibility query.
    if (!input.regionId) {
      throw new Error("Vui lòng chọn Khu vực cho TĐ/TĐM/NTĐ/KVT.");
    }
    const region = (await RegionModel.findById(input.regionId).lean()) as RegionRecord | null;
    if (!region) throw new Error("Khu vực không tồn tại.");
    return {
      regionId: region._id.toString(),
      teamId: region.teamId.toString(),
      zoneId: region.zoneId.toString(),
    };
  }

  if (input.role === "ZONE_LEAD") {
    if (!input.zoneId) {
      throw new Error("Vui lòng chọn Địa Vực cho ĐVT - NQL.");
    }
    const zone = (await ZoneModel.findById(input.zoneId).lean()) as ZoneRecord | null;
    if (!zone) throw new Error("Địa Vực không tồn tại.");
    return {
      regionId: null,
      teamId: zone.teamId.toString(),
      zoneId: zone._id.toString(),
    };
  }

  // TEAM_LEAD
  if (!input.teamId) {
    throw new Error("Vui lòng chọn Nhóm cho CS - ĐL.");
  }
  const team = (await TeamModel.findById(input.teamId).lean()) as TeamRecord | null;
  if (!team) throw new Error("Nhóm không tồn tại.");
  return {
    regionId: null,
    teamId: team._id.toString(),
    zoneId: null,
  };
}

export async function saveUser(input: SaveUserInput) {
  await connectToDatabase();

  const hierarchy = await resolveUserHierarchy({
    regionId: input.regionId,
    role: input.role,
    teamId: input.teamId,
    zoneId: input.zoneId,
  });

  const payload: Record<string, unknown> = {
    fullName: input.fullName,
    gender: input.gender === "female" ? "female" : "male",
    regionId: hierarchy.regionId ? toObjectId(hierarchy.regionId) : null,
    role: input.role,
    status: input.status,
    teamId: hierarchy.teamId ? toObjectId(hierarchy.teamId) : null,
    zoneId: hierarchy.zoneId ? toObjectId(hierarchy.zoneId) : null,
  };

  // Only set telegramId / username when explicitly provided,
  // otherwise we'd wipe them on edit and collide on the unique index.
  if (input.telegramId !== undefined) {
    payload.telegramId = input.telegramId;
  }
  if (input.username !== undefined) {
    payload.username = input.username.trim() || null;
  }

  let user;
  if (input.userId) {
    user = await UserModel.findByIdAndUpdate(input.userId, payload, { new: true });
  } else {
    user = await UserModel.create({
      ...payload,
      telegramId: payload.telegramId ?? null,
      username: payload.username ?? null,
    });
  }

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

export async function getZoneById(zoneId: string) {
  await connectToDatabase();
  return (await ZoneModel.findById(zoneId).lean()) as ZoneRecord | null;
}

export async function listTeams() {
  await connectToDatabase();
  return (await TeamModel.find().sort({ name: 1 }).lean()) as TeamRecord[];
}

export async function listZones(teamId?: string) {
  await connectToDatabase();
  const query = teamId ? { teamId: toObjectId(teamId) } : {};
  return (await ZoneModel.find(query).sort({ name: 1 }).lean()) as ZoneRecord[];
}

export async function listRegions(zoneId?: string) {
  await connectToDatabase();
  const query = zoneId ? { zoneId: toObjectId(zoneId) } : {};
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
    role: "TDM",
    status: "PENDING",
    telegramId: input.telegramId,
    username: input.username ? normalizeUsername(input.username) : null,
  });

  return serializeUser(user.toObject() as UserRecord);
}

export async function approveUser(
  actor: SessionUser,
  input: { regionId: string; userId: string },
) {
  await connectToDatabase();

  const pendingUser = (await UserModel.findById(input.userId).lean()) as UserRecord | null;
  if (!pendingUser) {
    throw new Error("Không tìm thấy người dùng.");
  }

  const serializedPending = serializeUser(pendingUser);
  if (!canReviewPendingUser(actor, serializedPending)) {
    throw new Error("Bạn không có quyền duyệt người dùng này.");
  }

  const region = (await RegionModel.findById(input.regionId).lean()) as RegionRecord | null;
  if (!region) throw new Error("Khu vực không tồn tại.");

  const pendingTeamId = stringifyId(pendingUser.teamId);
  const pendingZoneId = stringifyId((pendingUser as UserRecord & { zoneId?: unknown }).zoneId);
  if (pendingTeamId && pendingTeamId !== region.teamId.toString()) {
    throw new Error("Khu vực không thuộc Nhóm người dùng đã đăng ký.");
  }
  if (pendingZoneId && pendingZoneId !== region.zoneId.toString()) {
    throw new Error("Khu vực không thuộc Địa Vực người dùng đã đăng ký.");
  }

  const user = await UserModel.findByIdAndUpdate(
    input.userId,
    {
      regionId: region._id,
      role: serializedPending.role || "TDM",
      status: "ACTIVE",
      teamId: region.teamId,
      zoneId: region.zoneId,
    },
    { new: true },
  );

  if (!user) {
    throw new Error("Không tìm thấy người dùng.");
  }

  return serializeUser(user.toObject() as UserRecord);
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

export async function listPendingUsersForReview(actor: SessionUser) {
  await connectToDatabase();

  if (actor.role === "REGIONAL_LEAD") return [];

  const query: Record<string, unknown> = { status: "PENDING" };
  if (actor.role === "TEAM_LEAD") {
    if (!actor.teamId) return [];
    query.teamId = toObjectId(actor.teamId);
  } else if (actor.role === "ZONE_LEAD") {
    if (!actor.zoneId) return [];
    query.zoneId = toObjectId(actor.zoneId);
  } else if (actor.role !== "ADMIN") {
    return [];
  }

  const users = (await UserModel.find(query)
    .sort({ createdAt: -1 })
    .lean()) as UserRecord[];

  return users.map(serializeUser).filter((user) => canReviewPendingUser(actor, user));
}

export async function deleteTeam(teamId: string) {
  await connectToDatabase();
  const oid = toObjectId(teamId);
  const [userCount, zoneCount] = await Promise.all([
    UserModel.countDocuments({ teamId: oid }),
    ZoneModel.countDocuments({ teamId: oid }),
  ]);
  if (userCount > 0) {
    throw new Error(`Không thể xóa: Nhóm còn ${userCount} thành viên.`);
  }
  if (zoneCount > 0) {
    throw new Error(`Không thể xóa: Nhóm còn ${zoneCount} địa vực.`);
  }
  const deleted = await TeamModel.findByIdAndDelete(teamId);
  if (!deleted) throw new Error("Nhóm không tồn tại.");
}

export async function deleteZone(zoneId: string) {
  await connectToDatabase();
  const oid = toObjectId(zoneId);
  const [userCount, regionCount] = await Promise.all([
    UserModel.countDocuments({ zoneId: oid }),
    RegionModel.countDocuments({ zoneId: oid }),
  ]);
  if (userCount > 0) {
    throw new Error(`Không thể xóa: Địa vực còn ${userCount} thành viên.`);
  }
  if (regionCount > 0) {
    throw new Error(`Không thể xóa: Địa vực còn ${regionCount} khu vực.`);
  }
  const deleted = await ZoneModel.findByIdAndDelete(zoneId);
  if (!deleted) throw new Error("Địa vực không tồn tại.");
}

export async function deleteRegion(regionId: string) {
  await connectToDatabase();
  const oid = toObjectId(regionId);
  const userCount = await UserModel.countDocuments({ regionId: oid });
  if (userCount > 0) {
    throw new Error(`Không thể xóa: Khu vực còn ${userCount} thành viên.`);
  }
  const deleted = await RegionModel.findByIdAndDelete(regionId);
  if (!deleted) throw new Error("Khu vực không tồn tại.");
}

export async function deleteUser(userId: string) {
  await connectToDatabase();
  const userObjectId = toObjectId(userId);
  // Clean up any lead references before deleting so stale IDs don't linger.
  await Promise.all([
    TeamModel.updateMany(
      { leadUserIds: userObjectId },
      { $pull: { leadUserIds: userObjectId } },
    ),
    ZoneModel.updateMany(
      { leadUserIds: userObjectId },
      { $pull: { leadUserIds: userObjectId } },
    ),
    RegionModel.updateMany(
      { leadUserIds: userObjectId },
      { $pull: { leadUserIds: userObjectId } },
    ),
  ]);
  const deleted = await UserModel.findByIdAndDelete(userId);
  if (!deleted) throw new Error("Không tìm thấy người dùng.");
}

export async function bulkApproveUsers(_userIds: string[] = []): Promise<number> {
  void _userIds;
  throw new Error("Vui lòng duyệt từng thành viên và chọn Khu vực.");
}
