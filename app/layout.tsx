import type { Metadata } from "next";
import localFont from "next/font/local";
import { Nav, Footer } from "@/components/chrome";
import {
  SITE_CATEGORY_LINE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  siteUrlConfigured,
} from "@/site.config";
import { pageMetadata } from "@/lib/metadata";
import "./globals.css";

const inter = localFont({
  src: [
    { path: "../src/fonts/Inter-Regular.woff2", weight: "400", style: "normal" },
    { path: "../src/fonts/Inter-Medium.woff2", weight: "500", style: "normal" },
    { path: "../src/fonts/Inter-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../src/fonts/Inter-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const base = pageMetadata({ path: "/" });

export const metadata: Metadata = {
  // Only set when the production origin is configured. Without it Next would
  // resolve relative URLs against localhost, which is worse than omitting them.
  ...(siteUrlConfigured ? { metadataBase: new URL(SITE_URL) } : {}),
  title: {
    default: `${SITE_NAME} — ${SITE_CATEGORY_LINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: base.robots,
  alternates: base.alternates,
  openGraph: { ...base.openGraph, title: `${SITE_NAME} — ${SITE_CATEGORY_LINE}` },
  twitter: { ...base.twitter, title: `${SITE_NAME} — ${SITE_CATEGORY_LINE}` },
  icons: {
    icon: [
      { url: "/brand/favicon-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/brand/favicon-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
    ],
    apple: "/apple-touch-icon-180.png",
  },
};

/** Set the theme before first paint so there is no flash. */
const themeScript = `(function(){try{var s=localStorage.getItem("gs-theme");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="theme-color" content="#F3F0E9" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0F1211" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-4 focus:bg-forest focus:text-bone focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
