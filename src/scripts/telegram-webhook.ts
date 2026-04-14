/**
 * Telegram webhook management CLI.
 *
 *   tsx src/scripts/telegram-webhook.ts set     # register webhook URL
 *   tsx src/scripts/telegram-webhook.ts delete  # remove webhook
 *   tsx src/scripts/telegram-webhook.ts info    # print webhook status
 *
 * Required env: TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL (for `set`).
 * Optional env: TELEGRAM_WEBHOOK_SECRET (passed as `secret_token`).
 */
import dotenv from "dotenv";

dotenv.config();

type TelegramApiResponse = {
  ok: boolean;
  description?: string;
  result?: unknown;
};

function requireVar(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function callTelegram(
  method: string,
  body: Record<string, unknown> = {},
): Promise<TelegramApiResponse> {
  const token = requireVar("TELEGRAM_BOT_TOKEN");
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  return (await response.json()) as TelegramApiResponse;
}

async function setWebhook() {
  const appUrl = requireVar("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
  const webhookUrl = `${appUrl}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  const body: Record<string, unknown> = {
    allowed_updates: ["message", "callback_query"],
    url: webhookUrl,
  };

  if (secret) {
    body.secret_token = secret;
  }

  const result = await callTelegram("setWebhook", body);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
  console.log(`Webhook registered: ${webhookUrl}`);
}

async function deleteWebhook() {
  const result = await callTelegram("deleteWebhook", {
    drop_pending_updates: false,
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

async function info() {
  const result = await callTelegram("getWebhookInfo", {});
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case "set":
      await setWebhook();
      break;
    case "delete":
      await deleteWebhook();
      break;
    case "info":
      await info();
      break;
    default:
      console.error(
        "Usage: tsx src/scripts/telegram-webhook.ts <set|delete|info>",
      );
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
