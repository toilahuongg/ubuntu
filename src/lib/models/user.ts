import { InferSchemaType, model, models, Schema, Types } from "mongoose";

import { GENDERS, ROLES, USER_STATUSES } from "@/lib/domain";

const userSchema = new Schema(
  {
    bio: { default: "", trim: true, type: String },
    fullName: { required: true, trim: true, type: String },
    gender: { default: "male", enum: GENDERS, type: String },
    lastLoginAt: { default: null, type: Date },
    level: { default: 1, type: Number },
    regionId: { default: null, ref: "Region", type: Schema.Types.ObjectId },
    role: { enum: ROLES, required: true, type: String },
    status: { default: "ACTIVE", enum: USER_STATUSES, type: String },
    teamId: { default: null, ref: "Team", type: Schema.Types.ObjectId },
    zoneId: { default: null, ref: "Zone", type: Schema.Types.ObjectId },
    telegramId: { default: null, type: Number },
    totalXp: { default: 0, type: Number },
    pointBalance: { default: 0, min: 0, type: Number },
    equippedCosmetics: {
      default: () => ({
        prefix: null,
        suffix: null,
        color: null,
        effect: null,
        avatarFrame: null,
      }),
      type: {
        prefix: {
          default: null,
          ref: "Cosmetic",
          type: Schema.Types.ObjectId,
        },
        suffix: {
          default: null,
          ref: "Cosmetic",
          type: Schema.Types.ObjectId,
        },
        color: {
          default: null,
          ref: "Cosmetic",
          type: Schema.Types.ObjectId,
        },
        effect: {
          default: null,
          ref: "Cosmetic",
          type: Schema.Types.ObjectId,
        },
        avatarFrame: {
          default: null,
          ref: "Cosmetic",
          type: Schema.Types.ObjectId,
        },
      },
    },
    username: { default: null, trim: true, type: String },
    googleId: { default: null, trim: true, type: String },
    email: { default: null, lowercase: true, trim: true, type: String },
    avatarUrl: { default: null, trim: true, type: String },
    passwordHash: { default: null, type: String },
  },
  { timestamps: true },
);

userSchema.index({ totalXp: -1, level: -1 });
userSchema.index({ status: 1, role: 1, fullName: 1 });
userSchema.index({ status: 1, teamId: 1, role: 1, fullName: 1 });
userSchema.index({ status: 1, zoneId: 1, role: 1, fullName: 1 });
userSchema.index({ status: 1, regionId: 1, role: 1, fullName: 1 });
userSchema.index({ status: 1, createdAt: -1 });

// Unique only for users that actually have a telegramId (not null).
// Plain sparse:true won't work because we explicitly store `null`.
userSchema.index(
  { telegramId: 1 },
  {
    partialFilterExpression: { telegramId: { $type: "number" } },
    unique: true,
  },
);

userSchema.index(
  { googleId: 1 },
  {
    partialFilterExpression: { googleId: { $type: "string" } },
    unique: true,
  },
);

userSchema.index(
  { email: 1 },
  {
    partialFilterExpression: { email: { $type: "string" } },
    unique: true,
  },
);

userSchema.index(
  { username: 1 },
  {
    partialFilterExpression: { username: { $type: "string" } },
    unique: true,
  },
);

export type UserRecord = InferSchemaType<typeof userSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const UserModel = models.User || model("User", userSchema);
