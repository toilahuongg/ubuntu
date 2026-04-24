import { model, models, Schema, Types } from "mongoose";

const customerReminderLogSchema = new Schema(
  {
    customerId: { ref: "Customer", required: true, type: Schema.Types.ObjectId },
    date: { required: true, type: String },
    sentAt: { default: () => new Date(), type: Date },
    userId: { ref: "User", required: true, type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

customerReminderLogSchema.index(
  { customerId: 1, userId: 1, date: 1 },
  { unique: true },
);

export type CustomerReminderLogRecord = {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;
  date: string;
  sentAt: Date;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const CustomerReminderLogModel =
  models.CustomerReminderLog ||
  model("CustomerReminderLog", customerReminderLogSchema);
