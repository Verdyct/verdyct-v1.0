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
  metadataBase: new URL("https://verdyct.io"),
  title: "Verdyct | Logiciel douanier IA pour commissionnaires en douane",
  description:
    "Traitez vos dossiers de douane en 90 secondes avec Verdyct. Extraction documentaire, classification TARIC, contrôle de cohérence et conformité CBAM pour commissionnaires en douane indépendants.",
  applicationName: "Verdyct",
  keywords: [
    "logiciel douanier",
    "commissionnaire en douane",
    "logiciel commissionnaire en douane",
    "TARIC",
    "CBAM",
    "classification douanière",
    "automatisation douane",
    "dossiers douaniers",
    "IA douane",
    "courtage en douane",
  ],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Verdyct | Le logiciel douanier IA qui traite vos dossiers en 90 secondes",
    description:
      "Réduisez 45 minutes de saisie manuelle à 90 secondes. Verdyct automatise l'extraction documentaire, la classification TARIC, le contrôle de cohérence et la conformité CBAM.",
    url: "https://verdyct.io",
    siteName: "Verdyct",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Verdyct | Logiciel douanier IA pour commissionnaires en douane",
    description:
      "Automatisez vos dossiers de douane avec extraction documentaire, TARIC, contrôle de cohérence et CBAM dans un seul outil.",
  },
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
