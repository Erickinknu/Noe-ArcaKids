import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOE Admin",
  description: "Panel de administración NOE/ARCA KIDS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}