import type { Metadata } from "next";
import { Inter, Fustat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fustat = Fustat({
  subsets: ["latin"],
  variable: "--font-fustat",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SVOD Database Assistant",
  description:
    "Plain-English questions over a streaming knowledge graph. An agentic chatbot.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable} ${fustat.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
