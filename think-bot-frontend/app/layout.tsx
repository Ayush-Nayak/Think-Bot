import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Think-Bot — Multi-Agent AI Research Terminal",
  description:
    "Transform any topic into comprehensive research reports using autonomous AI agents powered by LangGraph, Groq, Tavily, and Notion.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Global scanning line effect */}
        <div className="scan-line" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
