import { Types } from "mongoose";

export function toObjectId(value: string) {
  return new Types.ObjectId(value);
}

export function stringifyId(value: Types.ObjectId | string | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.toString();
}
