import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const auditLogSchema = new Schema(
  {
    action: { required: true, type: String },
    actorUserId: { default: null, ref: "User", type: Schema.Types.ObjectId },
    entityId: { required: true, type: String },
    entityType: { required: true, type: String },
    metadata: { default: {}, type: Schema.Types.Mixed },
    subjectUserId: { default: null, ref: "User", type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

export type AuditLogRecord = InferSchemaType<typeof auditLogSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const AuditLogModel = models.AuditLog || model("AuditLog", auditLogSchema);
