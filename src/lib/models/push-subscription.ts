import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const pushSubscriptionSchema = new Schema(
  {
    userId: { index: true, ref: "User", required: true, type: Schema.Types.ObjectId },
    endpoint: { required: true, type: String, unique: true },
    p256dh: { required: true, type: String },
    auth: { required: true, type: String },
    userAgent: { type: String },
    lastUsedAt: { default: () => new Date(), type: Date },
  },
  { timestamps: true },
);

export type PushSubscriptionRecord = InferSchemaType<typeof pushSubscriptionSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const PushSubscriptionModel =
  models.PushSubscription || model("PushSubscription", pushSubscriptionSchema);
