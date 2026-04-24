import "server-only";

import mongoose from "mongoose";

import type { SessionUser } from "@/lib/domain";
import { connectToDatabase } from "@/lib/mongoose";
import {
  CustomerInteractionModel,
  CustomerModel,
  type CustomerRecord,
  PointTransactionModel,
  UserModel,
  type UserRecord,
  XpTransactionModel,
} from "@/lib/models";
import {
  calculateInteractionScore,
} from "@/lib/customer/scoring";
import type {
  InteractionOutcome,
  InteractionType,
  SharedContent,
} from "@/lib/customer/constants";
import {
  INTERACTION_OUTCOME_LABELS,
  ONE_TIME_INTERACTION_OUTCOMES,
} from "@/lib/customer/constants";
import { canCreateInteraction, canViewCustomer } from "@/lib/permissions";
import { getLevelFromXp } from "@/lib/xp";
import { grantLevelUnlocks } from "@/lib/services/cosmetics-service";
import { stringifyId, toObjectId } from "@/lib/utils/ids";

export type CreateInteractionInput = {
  caregiverId?: string | null;
  customerId: string;
  date?: Date;
  notes?: string;
  outcome: InteractionOutcome;
  sharedContent?: SharedContent | null;
  type: InteractionType;
};

export type UpdateInteractionInput = Omit<CreateInteractionInput, "customerId">;

export type InteractionResult = {
  expAwarded: number;
  interactionId: string;
  leveledUp: boolean;
  newLevel: number | null;
  pointsAwarded: number;
};

export type InteractionListItem = {
  caregiverId: string;
  caregiverName: string;
  createdAt: string;
  customerId: string;
  date: string;
  expAwarded: number;
  id: string;
  notes: string;
  outcome: InteractionOutcome;
  pointsAwarded: number;
  sharedContent: SharedContent | null;
  type: InteractionType;
};

function serializeInteraction(
  record: Awaited<ReturnType<typeof CustomerInteractionModel.findOne>>,
  caregiverName = "Người dùng",
): InteractionListItem {
  if (!record) throw new Error("Interaction not found");
  const r = record as unknown as {
    _id: { toString(): string };
    customerId: { toString(): string };
    caregiverId: { toString(): string };
    date: Date;
    type: string;
    sharedContent: string | null;
    outcome: string;
    pointsAwarded: number;
    expAwarded: number;
    notes: string;
    createdAt: Date;
  };
  return {
    id: r._id.toString(),
    customerId: r.customerId.toString(),
    caregiverId: r.caregiverId.toString(),
    caregiverName,
    date: r.date.toISOString(),
    type: r.type as InteractionType,
    sharedContent: r.sharedContent as SharedContent | null,
    outcome: r.outcome as InteractionOutcome,
    pointsAwarded: r.pointsAwarded,
    expAwarded: r.expAwarded,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  };
}

function serializeCustomerForPermission(customer: CustomerRecord) {
  return {
    caregiverIds: (customer.caregiverIds ?? []).map((id) => id.toString()),
    regionId: stringifyId(customer.regionId),
    teamId: stringifyId(customer.teamId),
    zoneId: stringifyId(customer.zoneId),
  };
}

function isOneTimeInteractionOutcome(
  outcome: InteractionOutcome,
): outcome is (typeof ONE_TIME_INTERACTION_OUTCOMES)[number] {
  return ONE_TIME_INTERACTION_OUTCOMES.includes(
    outcome as (typeof ONE_TIME_INTERACTION_OUTCOMES)[number],
  );
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

async function assertCanManageCustomerInteraction(
  actor: SessionUser,
  customer: CustomerRecord,
) {
  if (!canCreateInteraction(actor, serializeCustomerForPermission(customer))) {
    throw new Error("Bạn không có quyền chỉnh sửa tương tác của khách hàng này.");
  }
}

async function assertOneTimeOutcomeAvailable(
  customerId: string,
  outcome: InteractionOutcome,
  exceptInteractionId?: string,
  session?: mongoose.ClientSession,
) {
  if (!isOneTimeInteractionOutcome(outcome)) return;

  const existingMilestone = await CustomerInteractionModel.exists({
    ...(exceptInteractionId ? { _id: { $ne: toObjectId(exceptInteractionId) } } : {}),
    customerId: toObjectId(customerId),
    outcome,
  }).session(session ?? null);
  if (existingMilestone) {
    throw new Error(
      `Khách hàng này đã có kết quả ${INTERACTION_OUTCOME_LABELS[outcome]}.`,
    );
  }
}

async function assertSharedByUserExists(
  userId: string,
  session?: mongoose.ClientSession,
) {
  let userObjectId: ReturnType<typeof toObjectId>;
  try {
    userObjectId = toObjectId(userId);
  } catch {
    throw new Error("Người chia sẻ không hợp lệ.");
  }

  const userExists = await UserModel.exists({
    _id: userObjectId,
    status: "ACTIVE",
  }).session(session ?? null);
  if (!userExists) {
    throw new Error("Người chia sẻ không hợp lệ hoặc đã bị vô hiệu hoá.");
  }
}

async function resolveInteractionCaregiverId(input: {
  actor: SessionUser;
  fallbackCaregiverId?: string;
  requestedCaregiverId?: string | null;
  session?: mongoose.ClientSession;
  type: InteractionType;
}) {
  if (input.type !== "SHARE_CONTENT") {
    return input.fallbackCaregiverId ?? input.actor.id;
  }

  if (!input.requestedCaregiverId) {
    throw new Error("Vui lòng chọn người chia sẻ nội dung.");
  }

  await assertSharedByUserExists(input.requestedCaregiverId, input.session);

  return input.requestedCaregiverId;
}

async function syncCustomerInteractionSummary(
  customerId: string,
  session?: mongoose.ClientSession,
) {
  const customerObjectId = toObjectId(customerId);
  const [latestInteraction, baptismInteraction] = await Promise.all([
    CustomerInteractionModel.findOne({ customerId: customerObjectId })
      .sort({ date: -1 })
      .session(session ?? null)
      .lean(),
    CustomerInteractionModel.findOne({
      customerId: customerObjectId,
      outcome: "BAPTIZED",
    })
      .sort({ date: 1 })
      .session(session ?? null)
      .lean(),
  ]);

  const update: Record<string, unknown> = {
    lastInteractionAt: latestInteraction?.date ?? null,
    isBaptized: !!baptismInteraction,
    baptizedAt: baptismInteraction?.date ?? null,
  };
  await CustomerModel.findByIdAndUpdate(
    customerObjectId,
    { $set: update },
    session ? { session } : undefined,
  );
}

async function syncInteractionRewards(input: {
  caregiverId: string;
  customerName: string;
  interactionId: unknown;
  newScore: { exp: number; points: number };
  oldScore: { exp: number; points: number };
  oldCaregiverId?: string;
  session?: mongoose.ClientSession;
}) {
  const oldCaregiverId = input.oldCaregiverId ?? input.caregiverId;

  if (oldCaregiverId !== input.caregiverId) {
    await Promise.all([
      XpTransactionModel.deleteMany({
        source: "customer_interaction",
        sourceId: input.interactionId,
        userId: toObjectId(oldCaregiverId),
      }, input.session ? { session: input.session } : undefined),
      PointTransactionModel.deleteMany({
        source: "customer_interaction_reward",
        sourceId: input.interactionId,
        userId: toObjectId(oldCaregiverId),
      }, input.session ? { session: input.session } : undefined),
    ]);

    await syncUserRewardDelta(
      oldCaregiverId,
      -input.oldScore.exp,
      -input.oldScore.points,
      input.session,
    );
    await syncUserRewardDelta(
      input.caregiverId,
      input.newScore.exp,
      input.newScore.points,
      input.session,
    );
  } else {
    const expDelta = input.newScore.exp - input.oldScore.exp;
    const pointDelta = input.newScore.points - input.oldScore.points;

    if (expDelta !== 0 || pointDelta !== 0) {
      await syncUserRewardDelta(
        input.caregiverId,
        expDelta,
        pointDelta,
        input.session,
      );
    }
  }

  if (input.newScore.exp > 0) {
    await XpTransactionModel.updateOne(
      {
        source: "customer_interaction",
        sourceId: input.interactionId,
        userId: toObjectId(input.caregiverId),
      },
      {
        $set: {
          amount: input.newScore.exp,
          description: `Chăm sóc khách hàng: ${input.customerName}`,
        },
      },
      { session: input.session, upsert: true },
    );
  } else {
    await XpTransactionModel.deleteMany({
      source: "customer_interaction",
      sourceId: input.interactionId,
      userId: toObjectId(input.caregiverId),
    }, input.session ? { session: input.session } : undefined);
  }

  if (input.newScore.points > 0) {
    await PointTransactionModel.updateOne(
      {
        source: "customer_interaction_reward",
        sourceId: input.interactionId,
        userId: toObjectId(input.caregiverId),
      },
      {
        $set: {
          amount: input.newScore.points,
          description: `Thưởng chăm sóc khách hàng: ${input.customerName}`,
        },
      },
      { session: input.session, upsert: true },
    );
  } else {
    await PointTransactionModel.deleteMany({
      source: "customer_interaction_reward",
      sourceId: input.interactionId,
      userId: toObjectId(input.caregiverId),
    }, input.session ? { session: input.session } : undefined);
  }
}

async function syncUserRewardDelta(
  caregiverId: string,
  expDelta: number,
  pointDelta: number,
  session?: mongoose.ClientSession,
) {
  if (expDelta === 0 && pointDelta === 0) return;

  const updatedUser = (await UserModel.findByIdAndUpdate(
    caregiverId,
    {
      $inc: {
        totalXp: expDelta,
        pointBalance: pointDelta,
      },
    },
    { new: true, session },
  ).lean()) as UserRecord | null;

  if (updatedUser) {
    await UserModel.updateOne(
      { _id: toObjectId(caregiverId) },
      { $set: { level: getLevelFromXp(updatedUser.totalXp) } },
      session ? { session } : undefined,
    );
  }
}

function supportsMongoTransactions() {
  try {
    const client = mongoose.connection.getClient();
    const topo = (client as unknown as {
      topology?: { description?: { type?: string } };
    }).topology?.description?.type;
    return topo ? topo !== "Single" : false;
  } catch {
    return false;
  }
}

export async function createInteraction(
  input: CreateInteractionInput,
  caregiver: SessionUser,
): Promise<InteractionResult> {
  await connectToDatabase();
  const runBody = async (
    session?: mongoose.ClientSession,
  ): Promise<InteractionResult> => {
    const customer = (await CustomerModel.findById(input.customerId)
      .session(session ?? null)
      .lean()) as CustomerRecord | null;
    if (!customer) {
      throw new Error("Khách hàng không tồn tại.");
    }

    const customerView = {
      id: customer._id.toString(),
      ageBracket: customer.ageBracket,
      caregiverIds: (customer.caregiverIds ?? []).map((id) => id.toString()),
      createdAt: customer.createdAt.toISOString(),
      gender: customer.gender,
      heartStatus: customer.heartStatus,
      isBaptized: customer.isBaptized,
      lastInteractionAt: customer.lastInteractionAt
        ? customer.lastInteractionAt.toISOString()
        : null,
      name: customer.name,
      notes: customer.notes ?? "",
      occupation: customer.occupation,
      personality: customer.personality,
      teamId: customer.teamId ? customer.teamId.toString() : null,
      zoneId: customer.zoneId ? customer.zoneId.toString() : null,
      regionId: customer.regionId ? customer.regionId.toString() : null,
    };

    if (!canCreateInteraction(caregiver, customerView)) {
      throw new Error("Bạn không có quyền ghi tương tác cho khách hàng này.");
    }

    await assertOneTimeOutcomeAvailable(
      input.customerId,
      input.outcome,
      undefined,
      session,
    );

    const score = calculateInteractionScore(input.outcome);
    const interactionCaregiverId = await resolveInteractionCaregiverId({
      actor: caregiver,
      requestedCaregiverId: input.caregiverId,
      session,
      type: input.type,
    });

    const interactionDate = input.date ?? new Date();

    let interaction: { _id: { toString(): string } };
    try {
      const [createdInteraction] = (await CustomerInteractionModel.create(
        [
          {
            customerId: toObjectId(input.customerId),
            caregiverId: toObjectId(interactionCaregiverId),
            date: interactionDate,
            type: input.type,
            sharedContent: input.sharedContent ?? null,
            outcome: input.outcome,
            pointsAwarded: score.points,
            expAwarded: score.exp,
            notes: input.notes?.trim() ?? "",
          },
        ],
        session ? { session } : undefined,
      )) as [{ _id: { toString(): string } }];
      interaction = createdInteraction;
    } catch (error) {
      if (isOneTimeInteractionOutcome(input.outcome) && isDuplicateKeyError(error)) {
        throw new Error(
          `Khách hàng này đã có kết quả ${INTERACTION_OUTCOME_LABELS[input.outcome]}.`,
        );
      }
      throw error;
    }

    const customerUpdate: Record<string, unknown> = {
      lastInteractionAt: interactionDate,
    };
    if (input.outcome === "BAPTIZED") {
      customerUpdate.isBaptized = true;
      customerUpdate.baptizedAt = interactionDate;
    }
    await CustomerModel.findByIdAndUpdate(
      input.customerId,
      { $set: customerUpdate },
      session ? { session } : undefined,
    );

    let newLevel: number | null = null;
    let leveledUp = false;

    if (score.exp > 0 || score.points > 0) {
      if (score.exp > 0) {
        await XpTransactionModel.create(
          [
            {
              amount: score.exp,
              description: `Chăm sóc khách hàng: ${customer.name}`,
              source: "customer_interaction",
              sourceId: interaction._id,
              userId: toObjectId(interactionCaregiverId),
            },
          ],
          session ? { session } : undefined,
        );
      }

      if (score.points > 0) {
        await PointTransactionModel.create(
          [
            {
              amount: score.points,
              description: `Thưởng chăm sóc khách hàng: ${customer.name}`,
              source: "customer_interaction_reward",
              sourceId: interaction._id,
              userId: toObjectId(interactionCaregiverId),
            },
          ],
          session ? { session } : undefined,
        );
      }

      const updatedUser = (await UserModel.findByIdAndUpdate(
        interactionCaregiverId,
        {
          $inc: {
            totalXp: score.exp,
            pointBalance: score.points,
          },
        },
        { new: true, session },
      ).lean()) as UserRecord | null;

      if (updatedUser) {
        newLevel = getLevelFromXp(updatedUser.totalXp);
        if (newLevel !== updatedUser.level) {
          leveledUp = true;
          await UserModel.updateOne(
            { _id: toObjectId(interactionCaregiverId) },
            { $set: { level: newLevel } },
            session ? { session } : undefined,
          );
          try {
            await grantLevelUnlocks(interactionCaregiverId, newLevel, session);
          } catch (err) {
            console.error("[cosmetics] grantLevelUnlocks failed", err);
          }
        }
      }
    }

    return {
      expAwarded: score.exp,
      interactionId: interaction._id.toString(),
      leveledUp,
      newLevel,
      pointsAwarded: score.points,
    };
  };

  if (supportsMongoTransactions()) {
    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(() => runBody(session));
    } finally {
      await session.endSession();
    }
  }

  return runBody();
}

export async function updateInteraction(
  interactionId: string,
  input: UpdateInteractionInput,
  actor: SessionUser,
): Promise<InteractionListItem> {
  await connectToDatabase();
  const runBody = async (
    session?: mongoose.ClientSession,
  ): Promise<InteractionListItem> => {
    const interaction = (await CustomerInteractionModel.findById(interactionId)
      .session(session ?? null)
      .lean()) as
      | {
          _id: { toString(): string };
          caregiverId: { toString(): string };
          customerId: { toString(): string };
          date: Date;
          outcome: InteractionOutcome;
        }
      | null;
    if (!interaction) {
      throw new Error("Tương tác không tồn tại.");
    }

    const customer = (await CustomerModel.findById(interaction.customerId)
      .session(session ?? null)
      .lean()) as CustomerRecord | null;
    if (!customer) {
      throw new Error("Khách hàng không tồn tại.");
    }

    await assertCanManageCustomerInteraction(actor, customer);
    await assertOneTimeOutcomeAvailable(
      interaction.customerId.toString(),
      input.outcome,
      interactionId,
      session,
    );

    const oldScore = calculateInteractionScore(interaction.outcome);
    const newScore = calculateInteractionScore(input.outcome);
    const interactionCaregiverId = await resolveInteractionCaregiverId({
      actor,
      fallbackCaregiverId: interaction.caregiverId.toString(),
      requestedCaregiverId: input.caregiverId,
      session,
      type: input.type,
    });

    let updated: Awaited<ReturnType<typeof CustomerInteractionModel.findOne>> | null;
    try {
      updated = await CustomerInteractionModel.findByIdAndUpdate(
        interactionId,
        {
          $set: {
            date: input.date ?? interaction.date,
            caregiverId: toObjectId(interactionCaregiverId),
            expAwarded: newScore.exp,
            notes: input.notes?.trim() ?? "",
            outcome: input.outcome,
            pointsAwarded: newScore.points,
            sharedContent: input.sharedContent ?? null,
            type: input.type,
          },
        },
        { new: true, session },
      );
    } catch (error) {
      if (isOneTimeInteractionOutcome(input.outcome) && isDuplicateKeyError(error)) {
        throw new Error(
          `Khách hàng này đã có kết quả ${INTERACTION_OUTCOME_LABELS[input.outcome]}.`,
        );
      }
      throw error;
    }

    if (!updated) {
      throw new Error("Cập nhật tương tác thất bại.");
    }

    await syncInteractionRewards({
      caregiverId: interactionCaregiverId,
      customerName: customer.name,
      interactionId: interaction._id,
      newScore,
      oldScore,
      oldCaregiverId: interaction.caregiverId.toString(),
      session,
    });
    await syncCustomerInteractionSummary(interaction.customerId.toString(), session);

    return serializeInteraction(updated);
  };

  if (supportsMongoTransactions()) {
    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(() => runBody(session));
    } finally {
      await session.endSession();
    }
  }

  return runBody();
}

export async function deleteInteraction(
  interactionId: string,
  actor: SessionUser,
): Promise<{ customerId: string }> {
  await connectToDatabase();
  const runBody = async (
    session?: mongoose.ClientSession,
  ): Promise<{ customerId: string }> => {
    const interaction = (await CustomerInteractionModel.findById(interactionId)
      .session(session ?? null)
      .lean()) as
      | {
          _id: { toString(): string };
          caregiverId: { toString(): string };
          customerId: { toString(): string };
          outcome: InteractionOutcome;
        }
      | null;
    if (!interaction) {
      throw new Error("Tương tác không tồn tại.");
    }

    const customer = (await CustomerModel.findById(interaction.customerId)
      .session(session ?? null)
      .lean()) as CustomerRecord | null;
    if (!customer) {
      throw new Error("Khách hàng không tồn tại.");
    }

    await assertCanManageCustomerInteraction(actor, customer);

    const oldScore = calculateInteractionScore(interaction.outcome);
    await CustomerInteractionModel.findByIdAndDelete(
      interactionId,
      session ? { session } : undefined,
    );
    await syncInteractionRewards({
      caregiverId: interaction.caregiverId.toString(),
      customerName: customer.name,
      interactionId: interaction._id,
      newScore: { exp: 0, points: 0 },
      oldScore,
      session,
    });
    await syncCustomerInteractionSummary(interaction.customerId.toString(), session);

    return { customerId: interaction.customerId.toString() };
  };

  if (supportsMongoTransactions()) {
    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(() => runBody(session));
    } finally {
      await session.endSession();
    }
  }

  return runBody();
}

export async function listInteractionsByCustomer(
  customerId: string,
  actor: SessionUser,
): Promise<InteractionListItem[]> {
  await connectToDatabase();

  const customer = (await CustomerModel.findById(customerId).lean()) as
    | CustomerRecord
    | null;
  if (!customer) {
    throw new Error("Khách hàng không tồn tại.");
  }

  if (!canViewCustomer(actor, serializeCustomerForPermission(customer))) {
    throw new Error("Bạn không có quyền xem lịch sử tương tác này.");
  }

  const interactions = await CustomerInteractionModel.find({
    customerId: toObjectId(customerId),
  })
    .sort({ date: -1 })
    .lean();
  const caregiverIds = Array.from(
    new Set(interactions.map((interaction) => interaction.caregiverId.toString())),
  );
  const caregivers = (await UserModel.find({ _id: { $in: caregiverIds.map(toObjectId) } })
    .select("fullName")
    .lean()) as Pick<UserRecord, "_id" | "fullName">[];
  const caregiverNames = new Map(
    caregivers.map((caregiver) => [caregiver._id.toString(), caregiver.fullName]),
  );

  return interactions.map((r) =>
    serializeInteraction(
      r as unknown as Parameters<typeof serializeInteraction>[0],
      caregiverNames.get(r.caregiverId.toString()) ?? "Người dùng",
    ),
  );
}

export async function getCaregiverStats(
  caregiverId: string,
  options?: { startDate?: Date; endDate?: Date },
): Promise<{
  interactionCount: number;
  totalExp: number;
  totalPoints: number;
  baptizedCount: number;
}> {
  await connectToDatabase();

  const match: Record<string, unknown> = { caregiverId: toObjectId(caregiverId) };
  if (options?.startDate || options?.endDate) {
    match.date = {};
    if (options.startDate) (match.date as Record<string, Date>).$gte = options.startDate;
    if (options.endDate) (match.date as Record<string, Date>).$lte = options.endDate;
  }

  const result = await CustomerInteractionModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        interactionCount: { $sum: 1 },
        totalExp: { $sum: "$expAwarded" },
        totalPoints: { $sum: "$pointsAwarded" },
        baptizedCount: {
          $sum: { $cond: [{ $eq: ["$outcome", "BAPTIZED"] }, 1, 0] },
        },
      },
    },
  ]);

  const stats = result[0] ?? {
    interactionCount: 0,
    totalExp: 0,
    totalPoints: 0,
    baptizedCount: 0,
  };

  return {
    interactionCount: stats.interactionCount,
    totalExp: stats.totalExp,
    totalPoints: stats.totalPoints,
    baptizedCount: stats.baptizedCount,
  };
}
