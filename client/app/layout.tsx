import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";

const satoshi = localFont({
  src: [
    {
      path: "../public/assets/fonts/Satoshi-Variable.woff2",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/Satoshi-VariableItalic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-satoshi",
});

export const metadata: Metadata = {
  title: "Verdyct",
  description: "Le système d'exploitation métier pour commissionnaires en douane.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn("h-full", "antialiased", satoshi.variable, "font-sans")}>
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
