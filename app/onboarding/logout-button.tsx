"use client";

import { useState } from "react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("Không thể đăng xuất lúc này. Vui lòng thử lại.");
        return;
      }
      window.location.assign("/login");
    } catch {
      setError("Không thể đăng xuất lúc này. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1 text-center">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {loading ? "Đang đăng xuất..." : "Đăng xuất"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
