import "../styles/globals.css";
import { LocaleProvider } from "@/contexts/localeContext";

const BASE_URL = "https://gtnnetwork.com";

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "GTN - Global Telecom Network",
    template: "%s | GTN",
  },
  description:
    "Global Telecom Network (GTN) for calls, messaging, plans, and community voice rooms.",
  applicationName: "GTN",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#1e6ff2" }],
  },
  openGraph: {
    type: "website",
    siteName: "GTN",
    title: "GTN - Global Telecom Network",
    description:
      "Connect globally with GTN calls, messaging, plans, and community voice rooms.",
    url: BASE_URL,
    images: [
      {
        url: "/icons/referral.svg",
        width: 1200,
        height: 630,
        alt: "GTN - Global Telecom Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GTN - Global Telecom Network",
    description:
      "Connect globally with GTN calls, messaging, plans, and community voice rooms.",
    images: ["/icons/referral.svg"],
  },
};

export const viewport = {
  themeColor: "#1e6ff2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 dark:bg-gray-900">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
