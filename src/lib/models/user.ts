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
    telegramId: { default: null, index: true, sparse: true, type: Number, unique: true },
    totalXp: { default: 0, type: Number },
    username: { default: null, trim: true, type: String },
  },
  { timestamps: true },
);

userSchema.index({ totalXp: -1, level: -1 });

export type UserRecord = InferSchemaType<typeof userSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const UserModel = models.User || model("User", userSchema);
