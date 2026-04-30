import "server-only";

import { ROLE_LABELS, type SessionUser } from "@/lib/domain";
import { connectToDatabase } from "@/lib/mongoose";
import {
  CustomerHeartLogModel,
  CustomerInteractionModel,
  CustomerModel,
  type CustomerRecord,
  PointTransactionModel,
  UserModel,
  type UserRecord,
  XpTransactionModel,
} from "@/lib/models";
import {
  canManageCustomer,
  canViewCustomer,
  isAdmin,
  isRegionalLead,
  isTeamLead,
  isZoneLead,
} from "@/lib/permissions";
import { stringifyId, toObjectId } from "@/lib/utils/ids";
import type {
  AgeBracket,
  HeartStatus,
  InteractionOutcome,
  Occupation,
  Personality,
} from "@/lib/customer/constants";
import { getLevelFromXp } from "@/lib/xp";

export type CustomerListFilters = {
  ageBracket?: AgeBracket;
  caregiverId?: string;
  gender?: "male" | "female";
  heartStatus?: HeartStatus;
  interactionRecency?: "NO_INTERACTION" | "TODAY" | "OVERDUE_3" | "OVERDUE_7";
  isBaptized?: boolean;
  occupation?: Occupation;
  personality?: Personality;
  query?: string;
  sort?:
    | "NEWEST"
    | "OLDEST"
    | "NAME_ASC"
    | "LAST_INTERACTION_NEWEST"
    | "LAST_INTERACTION_OLDEST";
};

export type CustomerInput = {
  ageBracket: AgeBracket;
  caregiverIds?: string[];
  gender: "male" | "female";
  heartStatus?: HeartStatus;
  name: string;
  notes?: string;
  occupation: Occupation;
  personality: Personality;
  teamId?: string | null;
  zoneId?: string | null;
  regionId?: string | null;
};

export type CustomerListItem = {
  ageBracket: AgeBracket;
  caregiverIds: string[];
  caregivers: CustomerCaregiverOption[];
  createdAt: string;
  gender: "male" | "female";
  heartStatus: HeartStatus;
  id: string;
  isBaptized: boolean;
  lastInteractionAt: string | null;
  lastInteractionOutcome: InteractionOutcome | null;
  name: string;
  notes: string;
  occupation: Occupation;
  personality: Personality;
  teamId: string | null;
  zoneId: string | null;
  regionId: string | null;
};

export type CustomerDetail = CustomerListItem & {
  caregivers: CustomerCaregiverOption[];
  heartLogs: {
    changedAt: string;
    changedBy: string;
    newStatus: HeartStatus;
    oldStatus: HeartStatus;
  }[];
};

export type CustomerCaregiverOption = {
  id: string;
  fullName: string;
  roleLabel: string;
};

function serializeCaregiverOption(user: UserRecord): CustomerCaregiverOption {
  return {
    fullName: user.fullName,
    id: user._id.toString(),
    roleLabel: ROLE_LABELS[user.role],
  };
}

function serializeCustomer(
  record: CustomerRecord,
  caregivers: CustomerCaregiverOption[] = [],
  latestInteraction?: { date: Date; outcome: InteractionOutcome } | null,
): CustomerListItem {
  const lastInteractionAt = latestInteraction?.date ?? record.lastInteractionAt;

  return {
    ageBracket: record.ageBracket,
    caregiverIds: (record.caregiverIds ?? []).map((id) => id.toString()),
    caregivers,
    createdAt: record.createdAt.toISOString(),
    gender: record.gender,
    heartStatus: record.heartStatus,
    id: record._id.toString(),
    isBaptized: record.isBaptized,
    lastInteractionAt: lastInteractionAt ? lastInteractionAt.toISOString() : null,
    lastInteractionOutcome: latestInteraction?.outcome ?? null,
    name: record.name,
    notes: record.notes ?? "",
    occupation: record.occupation,
    personality: record.personality,
    teamId: record.teamId ? record.teamId.toString() : null,
    zoneId: record.zoneId ? record.zoneId.toString() : null,
    regionId: record.regionId ? record.regionId.toString() : null,
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfTomorrow() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

async function buildScopeCondition(actor: SessionUser) {
  if (isAdmin(actor)) return null;

  if (isTeamLead(actor) && actor.teamId) {
    const users = await UserModel.find(
      { teamId: toObjectId(actor.teamId) },
      { _id: 1 },
    ).lean();
    const caregiverIds = users.map((user) => user._id);
    return caregiverIds.length > 0
      ? ({ caregiverIds: { $in: caregiverIds } } as Record<string, unknown>)
      : ({ _id: null } as Record<string, unknown>);
  }

  if (isZoneLead(actor) && actor.zoneId) {
    const users = await UserModel.find(
      { zoneId: toObjectId(actor.zoneId) },
      { _id: 1 },
    ).lean();
    const caregiverIds = users.map((user) => user._id);
    return caregiverIds.length > 0
      ? ({ caregiverIds: { $in: caregiverIds } } as Record<string, unknown>)
      : ({ _id: null } as Record<string, unknown>);
  }

  if (isRegionalLead(actor) && actor.regionId) {
    const users = await UserModel.find(
      { regionId: toObjectId(actor.regionId) },
      { _id: 1 },
    ).lean();
    const caregiverIds = users.map((user) => user._id);
    return caregiverIds.length > 0
      ? ({ caregiverIds: { $in: caregiverIds } } as Record<string, unknown>)
      : ({ _id: null } as Record<string, unknown>);
  }

  return { caregiverIds: toObjectId(actor.id) };
}

async function buildListFilter(
  actor: SessionUser,
  filters?: CustomerListFilters,
) {
  const baseFilter: Record<string, unknown> = {};
  const andConditions: Record<string, unknown>[] = [];
  const scopeCondition = await buildScopeCondition(actor);
  if (scopeCondition) andConditions.push(scopeCondition);

  if (filters?.heartStatus) {
    baseFilter.heartStatus = filters.heartStatus;
  }
  if (filters?.ageBracket) {
    baseFilter.ageBracket = filters.ageBracket;
  }
  if (filters?.occupation) {
    baseFilter.occupation = filters.occupation;
  }
  if (filters?.personality) {
    baseFilter.personality = filters.personality;
  }
  if (filters?.gender) {
    baseFilter.gender = filters.gender;
  }
  if (filters?.isBaptized !== undefined) {
    baseFilter.isBaptized = filters.isBaptized;
  }
  const canUseCaregiverFilter =
    isAdmin(actor) ||
    (isTeamLead(actor) && !!actor.teamId) ||
    (isZoneLead(actor) && !!actor.zoneId) ||
    (isRegionalLead(actor) && !!actor.regionId) ||
    filters?.caregiverId === actor.id;

  if (filters?.caregiverId && canUseCaregiverFilter) {
    baseFilter.caregiverIds = toObjectId(filters.caregiverId);
  }

  const query = filters?.query?.trim();
  if (query) {
    const regex = { $options: "i", $regex: escapeRegex(query) };
    andConditions.push({
      $or: [{ name: regex }, { notes: regex }],
    });
  }

  if (filters?.interactionRecency === "NO_INTERACTION") {
    andConditions.push({
      $or: [{ lastInteractionAt: null }, { lastInteractionAt: { $exists: false } }],
    });
  } else if (filters?.interactionRecency === "TODAY") {
    andConditions.push({
      lastInteractionAt: { $gte: startOfToday(), $lt: startOfTomorrow() },
    });
  } else if (filters?.interactionRecency === "OVERDUE_3") {
    andConditions.push({
      $or: [
        { lastInteractionAt: { $lte: daysAgo(3) } },
        { lastInteractionAt: null },
        { lastInteractionAt: { $exists: false } },
      ],
    });
  } else if (filters?.interactionRecency === "OVERDUE_7") {
    andConditions.push({
      $or: [
        { lastInteractionAt: { $lte: daysAgo(7) } },
        { lastInteractionAt: null },
        { lastInteractionAt: { $exists: false } },
      ],
    });
  }

  const hasBaseFilter = Object.keys(baseFilter).length > 0;
  if (andConditions.length === 0) return hasBaseFilter ? baseFilter : {};
  if (!hasBaseFilter) {
    if (andConditions.length === 1) return andConditions[0];
    return { $and: andConditions };
  }

  return { $and: [baseFilter, ...andConditions] };
}

function buildListSort(sort: CustomerListFilters["sort"]): Record<string, 1 | -1> {
  if (sort === "OLDEST") return { createdAt: 1 };
  if (sort === "NAME_ASC") return { name: 1, createdAt: -1 };
  if (sort === "LAST_INTERACTION_NEWEST") {
    return { lastInteractionAt: -1, createdAt: -1 };
  }
  if (sort === "LAST_INTERACTION_OLDEST") {
    return { lastInteractionAt: 1, createdAt: -1 };
  }
  return { createdAt: -1 };
}

async function loadCustomerCaregivers(customers: CustomerRecord[]) {
  const caregiverIds = Array.from(
    new Set(
      customers.flatMap((customer) =>
        (customer.caregiverIds ?? []).map((caregiverId) => caregiverId.toString()),
      ),
    ),
  );

  if (caregiverIds.length === 0) return new Map<string, CustomerCaregiverOption>();

  const caregivers = (await UserModel.find({
    _id: { $in: caregiverIds.map(toObjectId) },
  }).lean()) as UserRecord[];

  return new Map(
    caregivers.map((caregiver) => [
      caregiver._id.toString(),
      serializeCaregiverOption(caregiver),
    ]),
  );
}

async function loadLatestCustomerInteractions(customers: CustomerRecord[]) {
  const customerIds = customers.map((customer) => customer._id);
  if (customerIds.length === 0) {
    return new Map<string, { date: Date; outcome: InteractionOutcome }>();
  }

  const latestInteractions = await CustomerInteractionModel.aggregate<{
    _id: unknown;
    date: Date;
    outcome: InteractionOutcome;
  }>([
    { $match: { customerId: { $in: customerIds } } },
    { $sort: { date: -1, createdAt: -1 } },
    {
      $group: {
        _id: "$customerId",
        date: { $first: "$date" },
        outcome: { $first: "$outcome" },
      },
    },
  ]);

  return new Map(
    latestInteractions.map((interaction) => [
      String(interaction._id),
      { date: interaction.date, outcome: interaction.outcome },
    ]),
  );
}

function uniqueCustomerCaregiverIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean))).slice(0, 3);
}

function canAssignCustomerCaregivers(actor: SessionUser) {
  if (isAdmin(actor)) return true;
  if (isTeamLead(actor)) return !!actor.teamId;
  if (isZoneLead(actor)) return !!actor.zoneId;
  if (isRegionalLead(actor)) return !!actor.regionId;
  return !!actor.regionId || !!actor.zoneId || !!actor.teamId;
}

function userIsInActorCustomerScope(actor: SessionUser, user: UserRecord) {
  if (user._id.toString() === actor.id) return true;
  if (isAdmin(actor)) return true;
  if (isTeamLead(actor)) return !!actor.teamId && actor.teamId === stringifyId(user.teamId);
  if (isZoneLead(actor)) return !!actor.zoneId && actor.zoneId === stringifyId(user.zoneId);
  if (isRegionalLead(actor)) {
    return !!actor.regionId && actor.regionId === stringifyId(user.regionId);
  }
  if (actor.regionId) return actor.regionId === stringifyId(user.regionId);
  if (actor.zoneId) return actor.zoneId === stringifyId(user.zoneId);
  if (actor.teamId) return actor.teamId === stringifyId(user.teamId);
  return user._id.toString() === actor.id;
}

function buildAssignableCaregiverFilter(actor: SessionUser) {
  const base: Record<string, unknown> = { status: "ACTIVE" };

  if (isAdmin(actor)) return base;
  if (isTeamLead(actor) && actor.teamId) {
    return { ...base, teamId: toObjectId(actor.teamId) };
  }
  if (isZoneLead(actor) && actor.zoneId) {
    return { ...base, zoneId: toObjectId(actor.zoneId) };
  }
  if (isRegionalLead(actor) && actor.regionId) {
    return { ...base, regionId: toObjectId(actor.regionId) };
  }
  if (actor.regionId) return { ...base, regionId: toObjectId(actor.regionId) };
  if (actor.zoneId) return { ...base, zoneId: toObjectId(actor.zoneId) };
  if (actor.teamId) return { ...base, teamId: toObjectId(actor.teamId) };
  return { ...base, _id: toObjectId(actor.id) };
}

function scopeFromActor(actor: SessionUser) {
  return {
    regionId: actor.regionId ?? null,
    teamId: actor.teamId ?? null,
    zoneId: actor.zoneId ?? null,
  };
}

function scopeFromUser(user: UserRecord) {
  return {
    regionId: stringifyId(user.regionId),
    teamId: stringifyId(user.teamId),
    zoneId: stringifyId(user.zoneId),
  };
}

async function loadCaregiversForAssignment(
  caregiverIds: string[],
  actor: SessionUser,
) {
  if (caregiverIds.length === 0) return [];

  const users = (await UserModel.find({
    _id: { $in: caregiverIds.map(toObjectId) },
    status: "ACTIVE",
  }).lean()) as UserRecord[];
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));
  const orderedUsers = caregiverIds.map((id) => usersById.get(id));

  if (orderedUsers.some((user) => !user)) {
    throw new Error("Người phụ trách không hợp lệ.");
  }

  const invalidScope = orderedUsers.some(
    (user) => user && !userIsInActorCustomerScope(actor, user),
  );
  if (invalidScope) {
    throw new Error("Bạn không có quyền phân công người phụ trách ngoài phạm vi quản lý.");
  }

  return orderedUsers as UserRecord[];
}

async function resolveCustomerAssignment(
  actor: SessionUser,
  requestedCaregiverIds: string[] | undefined,
  fallbackCaregiverIds: string[],
) {
  const caregiverIds = uniqueCustomerCaregiverIds(
    requestedCaregiverIds && requestedCaregiverIds.length > 0
      ? requestedCaregiverIds
      : fallbackCaregiverIds,
  );
  const caregivers = await loadCaregiversForAssignment(caregiverIds, actor);
  const scope = caregivers[0] ? scopeFromUser(caregivers[0]) : scopeFromActor(actor);

  return {
    caregiverIds,
    ...scope,
  };
}

async function reverseCustomerInteractionRewards(customerId: string) {
  const interactions = (await CustomerInteractionModel.find({
    customerId: toObjectId(customerId),
  }).lean()) as {
    _id: { toString(): string };
    caregiverId: { toString(): string };
    expAwarded: number;
    pointsAwarded: number;
  }[];

  if (interactions.length === 0) return;

  const deltas = new Map<string, { exp: number; points: number }>();
  for (const interaction of interactions) {
    const caregiverId = interaction.caregiverId.toString();
    const current = deltas.get(caregiverId) ?? { exp: 0, points: 0 };
    current.exp -= interaction.expAwarded ?? 0;
    current.points -= interaction.pointsAwarded ?? 0;
    deltas.set(caregiverId, current);
  }

  await Promise.all(
    Array.from(deltas.entries()).map(async ([caregiverId, delta]) => {
      const updatedUser = (await UserModel.findByIdAndUpdate(
        caregiverId,
        {
          $inc: {
            totalXp: delta.exp,
            pointBalance: delta.points,
          },
        },
        { new: true },
      ).lean()) as UserRecord | null;

      if (updatedUser) {
        await UserModel.updateOne(
          { _id: toObjectId(caregiverId) },
          { $set: { level: getLevelFromXp(updatedUser.totalXp) } },
        );
      }
    }),
  );

  const interactionIds = interactions.map((interaction) =>
    toObjectId(interaction._id.toString()),
  );
  await Promise.all([
    XpTransactionModel.deleteMany({
      source: "customer_interaction",
      sourceId: { $in: interactionIds },
    }),
    PointTransactionModel.deleteMany({
      source: "customer_interaction_reward",
      sourceId: { $in: interactionIds },
    }),
  ]);
}

export async function createCustomer(
  input: CustomerInput,
  createdBy: SessionUser,
): Promise<CustomerListItem> {
  await connectToDatabase();

  if (!canManageCustomer(createdBy)) {
    throw new Error("Bạn không có quyền tạo học viên.");
  }

  const assignment = await resolveCustomerAssignment(
    createdBy,
    canAssignCustomerCaregivers(createdBy) ? input.caregiverIds : undefined,
    [createdBy.id],
  );

  const customer = await CustomerModel.create({
    ageBracket: input.ageBracket,
    caregiverIds: assignment.caregiverIds.map(toObjectId),
    createdBy: toObjectId(createdBy.id),
    gender: input.gender,
    heartStatus: input.heartStatus ?? "LEARN_MORE",
    name: input.name.trim(),
    notes: input.notes?.trim() ?? "",
    occupation: input.occupation,
    personality: input.personality,
    teamId: assignment.teamId ? toObjectId(assignment.teamId) : null,
    zoneId: assignment.zoneId ? toObjectId(assignment.zoneId) : null,
    regionId: assignment.regionId ? toObjectId(assignment.regionId) : null,
  });

  return serializeCustomer(customer.toObject() as CustomerRecord);
}

export async function listAssignableCustomerCaregivers(
  actor: SessionUser,
): Promise<CustomerCaregiverOption[]> {
  await connectToDatabase();

  const users = (await UserModel.find(buildAssignableCaregiverFilter(actor))
    .sort({ role: 1, fullName: 1 })
    .lean()) as UserRecord[];

  return users.map(serializeCaregiverOption);
}

export async function updateCustomer(
  id: string,
  input: Partial<CustomerInput>,
  changedBy: SessionUser,
): Promise<CustomerListItem> {
  await connectToDatabase();

  const customer = (await CustomerModel.findById(id).lean()) as CustomerRecord | null;
  if (!customer) {
    throw new Error("Học viên không tồn tại.");
  }

  if (!canManageCustomer(changedBy, serializeCustomer(customer))) {
    throw new Error("Bạn không có quyền cập nhật học viên này.");
  }

  const update: Record<string, unknown> = {};

  if (input.name !== undefined) update.name = input.name.trim();
  if (input.ageBracket !== undefined) update.ageBracket = input.ageBracket;
  if (input.gender !== undefined) update.gender = input.gender;
  if (input.occupation !== undefined) update.occupation = input.occupation;
  if (input.personality !== undefined) update.personality = input.personality;
  if (input.notes !== undefined) update.notes = input.notes.trim();

  const assignmentTouched =
    input.caregiverIds !== undefined ||
    input.teamId !== undefined ||
    input.zoneId !== undefined ||
    input.regionId !== undefined;

  if (assignmentTouched) {
    if (!canAssignCustomerCaregivers(changedBy)) {
      throw new Error("Bạn không có quyền thay đổi phân công học viên này.");
    }

    const assignment = await resolveCustomerAssignment(
      changedBy,
      input.caregiverIds,
      (customer.caregiverIds ?? []).map((caregiverId) => caregiverId.toString()),
    );
    update.caregiverIds = assignment.caregiverIds.map(toObjectId);
    update.teamId = assignment.teamId ? toObjectId(assignment.teamId) : null;
    update.zoneId = assignment.zoneId ? toObjectId(assignment.zoneId) : null;
    update.regionId = assignment.regionId ? toObjectId(assignment.regionId) : null;
  }

  if (input.heartStatus !== undefined && input.heartStatus !== customer.heartStatus) {
    update.heartStatus = input.heartStatus;
    await CustomerHeartLogModel.create({
      customerId: customer._id,
      changedBy: toObjectId(changedBy.id),
      oldStatus: customer.heartStatus,
      newStatus: input.heartStatus,
    });
  }

  const updated = (await CustomerModel.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true },
  ).lean()) as CustomerRecord | null;

  if (!updated) {
    throw new Error("Cập nhật học viên thất bại.");
  }

  return serializeCustomer(updated);
}

export async function deleteCustomer(
  id: string,
  actor: SessionUser,
): Promise<void> {
  await connectToDatabase();

  const customer = (await CustomerModel.findById(id).lean()) as CustomerRecord | null;
  if (!customer) {
    throw new Error("Học viên không tồn tại.");
  }

  if (!canManageCustomer(actor, serializeCustomer(customer))) {
    throw new Error("Bạn không có quyền xoá học viên này.");
  }

  await reverseCustomerInteractionRewards(id);
  await CustomerModel.findByIdAndDelete(id);
  await CustomerInteractionModel.deleteMany({ customerId: toObjectId(id) });
  await CustomerHeartLogModel.deleteMany({ customerId: toObjectId(id) });
}

export async function getCustomerById(
  id: string,
  actor: SessionUser,
): Promise<CustomerDetail> {
  await connectToDatabase();

  const customer = (await CustomerModel.findById(id).lean()) as CustomerRecord | null;
  if (!customer) {
    throw new Error("Học viên không tồn tại.");
  }

  if (!canViewCustomer(actor, serializeCustomer(customer))) {
    throw new Error("Bạn không có quyền xem học viên này.");
  }

  const heartLogs = await CustomerHeartLogModel.find({ customerId: toObjectId(id) })
    .sort({ changedAt: -1 })
    .lean();
  const customerCaregiverIds = (customer.caregiverIds ?? []).map((caregiverId) =>
    caregiverId.toString(),
  );
  const caregiversById = await loadCustomerCaregivers([customer]);
  const caregivers = customerCaregiverIds
    .map((caregiverId) => caregiversById.get(caregiverId))
    .filter(
      (caregiver): caregiver is CustomerCaregiverOption => caregiver !== undefined,
    );

  return {
    ...serializeCustomer(customer, caregivers),
    heartLogs: heartLogs.map((log) => ({
      changedAt: log.changedAt.toISOString(),
      changedBy: log.changedBy.toString(),
      newStatus: log.newStatus,
      oldStatus: log.oldStatus,
    })),
  };
}

export async function listCustomers(
  actor: SessionUser,
  filters?: CustomerListFilters,
): Promise<CustomerListItem[]> {
  await connectToDatabase();

  const filter = await buildListFilter(actor, filters);
  const customers = (await CustomerModel.find(filter)
    .sort(buildListSort(filters?.sort))
    .lean()) as CustomerRecord[];
  const [caregiversById, latestInteractionsByCustomerId] = await Promise.all([
    loadCustomerCaregivers(customers),
    loadLatestCustomerInteractions(customers),
  ]);

  return customers.map((customer) => {
    const caregivers = (customer.caregiverIds ?? [])
      .map((caregiverId) => caregiversById.get(caregiverId.toString()))
      .filter(
        (caregiver): caregiver is CustomerCaregiverOption => caregiver !== undefined,
      );

    return serializeCustomer(
      customer,
      caregivers,
      latestInteractionsByCustomerId.get(customer._id.toString()) ?? null,
    );
  });
}
