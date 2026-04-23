import { DEFAULT_TIMEZONE } from "@/lib/domain";

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
    googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
    authSecret:
      process.env.AUTH_SECRET?.trim() ||
      process.env.SESSION_SECRET?.trim() ||
      "",
  };
}

export function isGoogleAuthConfigured() {
  const env = getOptionalEnv();
  return Boolean(env.googleClientId && env.googleClientSecret && env.authSecret);
}

export function requireEnv(
  name:
    | "MONGODB_URI"
    | "SESSION_SECRET"
    | "TELEGRAM_BOT_TOKEN"
    | "TELEGRAM_WEBHOOK_SECRET"
    | "NEXT_PUBLIC_APP_URL"
    | "CRON_SECRET"
    | "GOOGLE_CLIENT_ID"
    | "GOOGLE_CLIENT_SECRET"
    | "AUTH_SECRET",
) {
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
