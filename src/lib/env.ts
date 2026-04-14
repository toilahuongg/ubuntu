import { DEFAULT_TIMEZONE } from "@/lib/domain";
import dotenv from "dotenv";

dotenv.config();
export function getOptionalEnv() {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || "",
    appTimezone: process.env.APP_TIMEZONE?.trim() || DEFAULT_TIMEZONE,
    cronSecret: process.env.CRON_SECRET?.trim() || "",
    mongodbUri: process.env.MONGODB_URI?.trim() || "",
    sessionSecret: process.env.SESSION_SECRET?.trim() || "",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || "",
    telegramBotUsername:
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() || "",
    telegramWebhookSecret:
      process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || "",
  };
}

export function requireEnv(
  name:
    | "MONGODB_URI"
    | "SESSION_SECRET"
    | "TELEGRAM_BOT_TOKEN"
    | "NEXT_PUBLIC_APP_URL"
    | "CRON_SECRET",
) {
  console.log(process.env.MONGODB_URI);

  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function isCoreAppConfigured() {
  const env = getOptionalEnv();

  return Boolean(
    env.mongodbUri && env.sessionSecret && env.telegramBotToken && env.appUrl,
  );
}
