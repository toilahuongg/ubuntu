import { InferSchemaType, model, models, Schema, Types } from "mongoose";

export const COSMETIC_SLOTS = [
  "prefix",
  "suffix",
  "color",
  "effect",
  "avatarFrame",
] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

export const COSMETIC_RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary",
] as const;
export type CosmeticRarity = (typeof COSMETIC_RARITIES)[number];

const cosmeticPayloadSchema = new Schema(
  {
    icon: { default: null, trim: true, type: String },
    cssClass: { default: null, trim: true, type: String },
    gradient: { default: null, type: [String] },
  },
  { _id: false },
);

const cosmeticSchema = new Schema(
  {
    code: { required: true, trim: true, type: String, unique: true },
    name: { required: true, trim: true, type: String },
    description: { default: "", trim: true, type: String },
    slot: { enum: COSMETIC_SLOTS, required: true, type: String },
    rarity: { default: "common", enum: COSMETIC_RARITIES, type: String },
    payload: { default: () => ({}), type: cosmeticPayloadSchema },
    cost: { default: null, min: 0, type: Number },
    unlockLevel: { default: null, min: 1, type: Number },
    active: { default: true, type: Boolean },
  },
  { timestamps: true },
);

cosmeticSchema.index({ slot: 1, active: 1 });
cosmeticSchema.index({ unlockLevel: 1 });

export type CosmeticRecord = InferSchemaType<typeof cosmeticSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const CosmeticModel =
  models.Cosmetic || model("Cosmetic", cosmeticSchema);
