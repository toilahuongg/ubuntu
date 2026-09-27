import { NextResponse } from "next/server";

import { requireEnv } from "@/lib/env";
import { seedAdminAccount } from "@/lib/seed";

function isAuthorized(request: Request) {
  const secret = request.headers.get("x-seed-secret");
  return !!secret && secret === requireEnv("SEED_SECRET");
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized seed request." },
      { status: 401 },
    );
  }

  const admin = await seedAdminAccount();

  return NextResponse.json({
    admin,
    message: "Seed completed. Created 1 admin account.",
  });
}
