import { Suspense } from "react";
import { LoginContent } from "./login-content";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
