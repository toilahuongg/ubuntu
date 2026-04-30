import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  ScrollRestoration,
  useRouteError,
} from "react-router";

import "app/globals.css";

export const meta = () => [
  { title: "Ubuntu" },
  {
    name: "description",
    content:
      "Web app giao và cập nhật nhiệm vụ hàng ngày qua Telegram WebApp cho NT, KVT và TĐ.",
  },
  { name: "robots", content: "noindex,nofollow,noarchive,nosnippet,noimageindex" },
  { name: "mobile-web-app-capable", content: "yes" },
  { name: "theme-color", content: "#f6f7fb" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
        <link rel="icon" type="image/svg+xml" href="/icons/logo.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground bg-gradient-mesh">
        {children}
        <script src="https://telegram.org/js/telegram-web-app.js" async />
        <ScrollRestoration />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message =
    isRouteErrorResponse(error) && error.status === 404
      ? "Không tìm thấy trang."
      : "Đã có lỗi xảy ra.";

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-card max-w-sm p-6 text-center">
        <h1 className="font-display text-lg font-bold">{message}</h1>
      </div>
    </main>
  );
}
