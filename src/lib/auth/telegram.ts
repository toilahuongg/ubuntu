import "server-only";

import crypto from "node:crypto";

import { requireEnv } from "@/lib/env";

export type TelegramProfile = {
  authDate: number;
  firstName?: string;
  id: number;
  lastName?: string;
  username?: string;
};

export function verifyTelegramInitData(initData: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new Error("Thiếu hash từ Telegram.");
  }

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(requireEnv("TELEGRAM_BOT_TOKEN"))
    .digest();

  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  if (expectedHash !== hash) {
    throw new Error("Xác thực Telegram không hợp lệ.");
  }

  const authDate = Number(params.get("auth_date") || "0");

  if (!authDate) {
    throw new Error("Thiếu auth_date từ Telegram.");
  }

  const ageInSeconds = Math.floor(Date.now() / 1000) - authDate;

  if (ageInSeconds > 60 * 60 * 24) {
    throw new Error("Phiên Telegram đã hết hạn.");
  }

  const userValue = params.get("user");

  if (!userValue) {
    throw new Error("Thiếu thông tin người dùng Telegram.");
  }

  return JSON.parse(userValue) as TelegramProfile;
}

export function signTelegramInitDataForTests(
  payload: Record<string, string>,
  botToken: string,
) {
  const params = new URLSearchParams(payload);
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const dataCheckString = [...params.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const hash = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  params.set("hash", hash);
  return params.toString();
}
