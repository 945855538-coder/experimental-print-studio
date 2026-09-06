import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Halftone Lab",
  description: "A minimal browser-based image processing workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
