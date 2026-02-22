import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FlowAI — AI Flowchart Builder",
    template: "%s · FlowAI",
  },
  description:
    "Create, edit, and share flowcharts instantly with AI. Describe any process in plain English and FlowAI generates a professional diagram in seconds.",
  keywords: [
    "flowchart", "AI flowchart", "diagram maker", "flowchart generator",
    "AI diagram", "process flow", "flowchart builder", "online flowchart",
  ],
  authors: [{ name: "FlowAI" }],
  creator: "FlowAI",
  metadataBase: new URL("https://flowai.app"),
  openGraph: {
    title: "FlowAI — AI Flowchart Builder",
    description:
      "Create professional flowcharts from plain English using AI. Free to use, no sign-up required.",
    type: "website",
    locale: "en_US",
    siteName: "FlowAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowAI — AI Flowchart Builder",
    description:
      "Create professional flowcharts from plain English using AI.",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
