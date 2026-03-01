import "./globals.css";

export const metadata = {
  title: "Signal24 — Live News Streams",
  description:
    "Live news streams covering the Iran-US-Israel-Gulf conflict. Real-time coverage from global news networks.",
  keywords:
    "live news, war coverage, Iran, USA, Israel, Gulf, breaking news, live streams, signal24",
  openGraph: {
    title: "Signal24 — Live News Streams",
    description: "Real-time live news coverage from global networks",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/Logo.svg" type="image/svg+xml" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
