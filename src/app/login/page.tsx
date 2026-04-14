import { Suspense } from "react";

import { listDevLoginUsers } from "@/lib/services/organization-service";

import { DevLoginPanel } from "./dev-login-panel";
import { LoginContent } from "./login-content";

export default async function LoginPage() {
  const isDev = process.env.NODE_ENV !== "production";
  const devUsers = isDev ? await listDevLoginUsers().catch(() => []) : [];

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </main>
      }
    >
      <LoginContent />
      {isDev && <DevLoginPanel users={devUsers} />}
    </Suspense>
  );
}
