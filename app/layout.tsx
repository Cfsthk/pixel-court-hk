import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;

  return {
    metadataBase: new URL(baseUrl),
    title: "判讀法庭：像素裁決｜Pixel Court",
    description:
      "閱讀雙方陳詞，找出證據，作出裁決。供小一至小六學生使用的像素法庭閱讀遊戲原型。",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "判讀法庭：像素裁決",
      description: "每個故事都有兩面。證據會說出甚麼？",
      locale: "zh_HK",
      type: "website",
      images: [{ url: `${baseUrl}/og.svg`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "判讀法庭：像素裁決",
      description: "每個故事都有兩面。證據會說出甚麼？",
      images: [`${baseUrl}/og.svg`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-HK">
      <body>{children}</body>
    </html>
  );
}
