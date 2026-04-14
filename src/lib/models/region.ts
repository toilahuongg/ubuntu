import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const regionSchema = new Schema(
  {
    code: { required: true, trim: true, type: String, unique: true },
    leadUserIds: [{ ref: "User", type: Schema.Types.ObjectId }],
    name: { required: true, trim: true, type: String },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId },
    telegramChatId: { default: null, index: true, sparse: true, type: Number },
    telegramChatTitle: { default: null, trim: true, type: String },
    zoneId: { ref: "Zone", required: true, type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

export type RegionRecord = InferSchemaType<typeof regionSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const RegionModel = models.Region || model("Region", regionSchema);
