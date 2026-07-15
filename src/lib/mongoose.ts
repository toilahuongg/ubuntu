import mongoose from "mongoose";

import { requireEnv } from "@/lib/env";

declare global {
  var __mongooseCache:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const globalCache = global.__mongooseCache ?? {
  conn: null,
  promise: null,
};

global.__mongooseCache = globalCache;

export async function connectToDatabase() {
  if (globalCache.conn) {
    return globalCache.conn;
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(withRetryWritesDisabled(requireEnv("MONGODB_URI")), {
      dbName: "daily-task-app",
    });
  }

  globalCache.conn = await globalCache.promise;

  return globalCache.conn;
}

export function withRetryWritesDisabled(uri: string) {
  const [base, query = ""] = uri.split("?");
  const params = new URLSearchParams(query);
  params.set("retryWrites", "false");

  return `${base}?${params.toString()}`;
}
