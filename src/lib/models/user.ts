import { InferSchemaType, model, models, Schema, Types } from "mongoose";

import { ROLES, USER_STATUSES } from "@/lib/domain";

const userSchema = new Schema(
  {
    fullName: { required: true, trim: true, type: String },
    lastLoginAt: { default: null, type: Date },
    regionId: { default: null, ref: "Region", type: Schema.Types.ObjectId },
    role: { enum: ROLES, required: true, type: String },
    status: { default: "ACTIVE", enum: USER_STATUSES, type: String },
    teamId: { default: null, ref: "Team", type: Schema.Types.ObjectId },
    telegramId: { default: null, index: true, sparse: true, type: Number, unique: true },
    username: { default: null, trim: true, type: String },
  },
  { timestamps: true },
);

export type UserRecord = InferSchemaType<typeof userSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const UserModel = models.User || model("User", userSchema);
