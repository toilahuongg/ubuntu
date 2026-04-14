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

export type TelegramLoginWidgetData = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

export function verifyTelegramLoginWidget(
  data: TelegramLoginWidgetData,
): TelegramProfile {
  const { hash, ...rest } = data;

  const dataCheckString = Object.entries(rest)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = crypto
    .createHash("sha256")
    .update(requireEnv("TELEGRAM_BOT_TOKEN"))
    .digest();

  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  if (expectedHash !== hash) {
    throw new Error("Xác thực Telegram không hợp lệ.");
  }

  if (!data.auth_date) {
    throw new Error("Thiếu auth_date từ Telegram.");
  }

  const ageInSeconds = Math.floor(Date.now() / 1000) - data.auth_date;

  if (ageInSeconds > 60 * 60 * 24) {
    throw new Error("Phiên Telegram đã hết hạn.");
  }

  return {
    authDate: data.auth_date,
    firstName: data.first_name,
    id: data.id,
    lastName: data.last_name,
    username: data.username,
  };
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
