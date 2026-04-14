import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const XP_SOURCES = ["task_completion"] as const;

const xpTransactionSchema = new Schema(
  {
    amount: { required: true, type: Number },
    description: { default: "", type: String },
    source: { enum: XP_SOURCES, required: true, type: String },
    sourceId: { default: null, type: Schema.Types.ObjectId },
    userId: { index: true, ref: "User", required: true, type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

xpTransactionSchema.index({ userId: 1, createdAt: -1 });

export type XpTransactionRecord = InferSchemaType<typeof xpTransactionSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const XpTransactionModel =
  models.XpTransaction || model("XpTransaction", xpTransactionSchema);
