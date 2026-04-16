import { InferSchemaType, model, models, Schema, Types } from "mongoose";

export const COSMETIC_ACQUIRE_SOURCES = [
  "purchase",
  "level_unlock",
  "admin_grant",
] as const;
export type CosmeticAcquireSource = (typeof COSMETIC_ACQUIRE_SOURCES)[number];

const userCosmeticSchema = new Schema(
  {
    userId: { index: true, ref: "User", required: true, type: Schema.Types.ObjectId },
    cosmeticId: { ref: "Cosmetic", required: true, type: Schema.Types.ObjectId },
    acquiredVia: {
      enum: COSMETIC_ACQUIRE_SOURCES,
      required: true,
      type: String,
    },
  },
  { timestamps: true },
);

userCosmeticSchema.index({ userId: 1, cosmeticId: 1 }, { unique: true });

export type UserCosmeticRecord = InferSchemaType<typeof userCosmeticSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const UserCosmeticModel =
  models.UserCosmetic || model("UserCosmetic", userCosmeticSchema);
