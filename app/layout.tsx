import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "判讀法庭：像素裁決｜Pixel Court",
  description:
    "從小一至小六各 30 宗像素法庭案件中選擇，閱讀雙方陳詞、破解證據挑戰，再比較你的判決與公平判決。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "判讀法庭：像素裁決",
    description: "每級 30 宗案件。每個故事都有兩面，證據會說出甚麼？",
    locale: "zh_HK",
    type: "website",
    images: [{ url: "/og.svg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "判讀法庭：像素裁決",
    description: "每級 30 宗案件。每個故事都有兩面，證據會說出甚麼？",
    images: ["/og.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-HK">
      <body>{children}</body>
    </html>
  );
}
