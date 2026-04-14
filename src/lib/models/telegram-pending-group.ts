import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const telegramPendingGroupSchema = new Schema(
  {
    chatId: { required: true, type: Number, unique: true },
    detectedAt: { default: () => new Date(), type: Date },
    title: { required: true, trim: true, type: String },
    type: { required: true, type: String },
  },
  { timestamps: true },
);

export type TelegramPendingGroupRecord = InferSchemaType<
  typeof telegramPendingGroupSchema
> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const TelegramPendingGroupModel =
  models.TelegramPendingGroup ||
  model("TelegramPendingGroup", telegramPendingGroupSchema);
