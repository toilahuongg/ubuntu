import { InferSchemaType, model, models, Schema, Types } from "mongoose";

import {
  AGE_BRACKETS,
  HEART_STATUSES,
  OCCUPATIONS,
  PERSONALITIES,
} from "@/lib/customer/constants";
import { GENDERS } from "@/lib/domain";

const customerSchema = new Schema(
  {
    ageBracket: { enum: AGE_BRACKETS, required: true, type: String },
    baptizedAt: { default: null, type: Date },
    caregiverIds: {
      default: [],
      type: [{ ref: "User", type: Schema.Types.ObjectId }],
      validate: {
        message: "Mỗi học viên chỉ có tối đa 3 người chăm sóc.",
        validator: (v: Types.ObjectId[]) => v.length <= 3,
      },
    },
    createdBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    gender: { enum: GENDERS, required: true, type: String },
    heartStatus: { default: "LEARN_MORE", enum: HEART_STATUSES, type: String },
    isBaptized: { default: false, type: Boolean },
    lastInteractionAt: { default: null, type: Date },
    name: { required: true, trim: true, type: String },
    notes: { default: "", trim: true, type: String },
    occupation: { enum: OCCUPATIONS, required: true, type: String },
    personality: { enum: PERSONALITIES, required: true, type: String },
    regionId: { default: null, ref: "Region", type: Schema.Types.ObjectId },
    teamId: { default: null, ref: "Team", type: Schema.Types.ObjectId },
    zoneId: { default: null, ref: "Zone", type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

customerSchema.index({ teamId: 1, createdAt: -1 });
customerSchema.index({ zoneId: 1, createdAt: -1 });
customerSchema.index({ regionId: 1, createdAt: -1 });
customerSchema.index({ caregiverIds: 1, createdAt: -1 });
customerSchema.index({ heartStatus: 1 });
customerSchema.index({ lastInteractionAt: 1 });
customerSchema.index({ isBaptized: 1 });

export type CustomerRecord = InferSchemaType<typeof customerSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const CustomerModel = models.Customer || model("Customer", customerSchema);
