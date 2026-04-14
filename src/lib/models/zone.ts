import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const zoneSchema = new Schema(
  {
    code: { required: true, trim: true, type: String, unique: true },
    leadUserIds: [{ ref: "User", type: Schema.Types.ObjectId }],
    name: { required: true, trim: true, type: String },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId },
    telegramChatId: { default: null, index: true, sparse: true, type: Number },
    telegramChatTitle: { default: null, trim: true, type: String },
  },
  { timestamps: true },
);

export type ZoneRecord = InferSchemaType<typeof zoneSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ZoneModel = models.Zone || model("Zone", zoneSchema);
