import { InferSchemaType, model, models, Schema, Types } from "mongoose";

import {
  INTERACTION_OUTCOMES,
  INTERACTION_TYPES,
  ONE_TIME_INTERACTION_OUTCOMES,
  SHARED_CONTENTS,
} from "@/lib/customer/constants";

const customerInteractionSchema = new Schema(
  {
    caregiverId: { ref: "User", required: true, type: Schema.Types.ObjectId },
    customerId: {
      index: true,
      ref: "Customer",
      required: true,
      type: Schema.Types.ObjectId,
    },
    date: { default: () => new Date(), type: Date },
    expAwarded: { default: 0, type: Number },
    notes: { default: "", trim: true, type: String },
    outcome: { enum: INTERACTION_OUTCOMES, required: true, type: String },
    pointsAwarded: { default: 0, type: Number },
    sharedContent: {
      default: null,
      enum: SHARED_CONTENTS,
      type: String,
    },
    type: { enum: INTERACTION_TYPES, required: true, type: String },
  },
  { timestamps: true },
);

customerInteractionSchema.index({ customerId: 1, date: -1 });
customerInteractionSchema.index({ caregiverId: 1, date: -1 });
customerInteractionSchema.index({ customerId: 1, caregiverId: 1, date: -1 });
customerInteractionSchema.index(
  { customerId: 1, outcome: 1 },
  {
    partialFilterExpression: {
      outcome: { $in: [...ONE_TIME_INTERACTION_OUTCOMES] },
    },
    unique: true,
  },
);

export type CustomerInteractionRecord = InferSchemaType<
  typeof customerInteractionSchema
> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const CustomerInteractionModel =
  models.CustomerInteraction ||
  model("CustomerInteraction", customerInteractionSchema);
