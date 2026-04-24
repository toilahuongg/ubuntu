import {
  deleteModel,
  InferSchemaType,
  model,
  models,
  Schema,
  Types,
} from "mongoose";

export const XP_SOURCES = ["task_completion", "customer_interaction"] as const;
export type XpSource = (typeof XP_SOURCES)[number];

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

function cachedModelHasCurrentSourceEnum() {
  const sourcePath = models.XpTransaction?.schema.path("source") as
    | { enumValues?: string[] }
    | undefined;
  const enumValues = sourcePath?.enumValues ?? [];
  return XP_SOURCES.every((source) => enumValues.includes(source));
}

if (models.XpTransaction && !cachedModelHasCurrentSourceEnum()) {
  deleteModel("XpTransaction");
}

export type XpTransactionRecord = InferSchemaType<typeof xpTransactionSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const XpTransactionModel =
  models.XpTransaction || model("XpTransaction", xpTransactionSchema);
