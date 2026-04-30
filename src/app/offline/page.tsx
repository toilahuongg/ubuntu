export default function OfflinePage() {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Ngoại tuyến - Ubuntu</title>
        <meta name="theme-color" content="#7C3AED" />
      </head>
      <body style={{ margin: 0, background: "#F0EAFF" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100dvh",
            padding: "24px",
            textAlign: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#1e1b4b",
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            style={{ marginBottom: 24 }}
          >
            <rect width="80" height="80" rx="24" fill="#7C3AED" />
            <path
              d="M40 24c-6.6 0-12 5.4-12 12v4M28 40l12 12 12-12"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="40"
              y1="52"
              x2="40"
              y2="60"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="40"
              y1="12"
              x2="40"
              y2="20"
              stroke="#7C3AED"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line
              x1="28"
              y1="16"
              x2="34"
              y2="18"
              stroke="#7C3AED"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
            Bạn đang ngoại tuyến
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              margin: "0 0 32px",
              maxWidth: 280,
              opacity: 0.6,
            }}
          >
            Vui lòng kiểm tra kết nối mạng và thử lại.
          </p>
          <a
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 24px",
              borderRadius: 12,
              background: "#1e1b4b",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            Thử lại
          </a>
        </div>
      </body>
    </html>
  );
}
