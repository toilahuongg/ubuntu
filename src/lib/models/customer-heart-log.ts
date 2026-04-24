import { InferSchemaType, model, models, Schema, Types } from "mongoose";

import { HEART_STATUSES } from "@/lib/customer/constants";

const customerHeartLogSchema = new Schema(
  {
    changedAt: { default: () => new Date(), type: Date },
    changedBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    customerId: {
      index: true,
      ref: "Customer",
      required: true,
      type: Schema.Types.ObjectId,
    },
    newStatus: { enum: HEART_STATUSES, required: true, type: String },
    oldStatus: { enum: HEART_STATUSES, required: true, type: String },
  },
  { timestamps: true },
);

customerHeartLogSchema.index({ customerId: 1, changedAt: -1 });

export type CustomerHeartLogRecord = InferSchemaType<
  typeof customerHeartLogSchema
> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const CustomerHeartLogModel =
  models.CustomerHeartLog ||
  model("CustomerHeartLog", customerHeartLogSchema);
