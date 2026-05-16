import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TV — thorsteinson.com",
  description: "IPTV player for thorsteinson.com apps",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
