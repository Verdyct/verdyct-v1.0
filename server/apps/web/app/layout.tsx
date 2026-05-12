import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verdyct",
  description: "Plateforme douanière intelligente",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
