import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";

const frizQuadrata = localFont({
  src: "../../public/fonts/friz-quadrata-regular.ttf",
  variable: "--font-friz-quadrata",
  display: "swap",
});

const montserrat = localFont({
  src: "../../public/fonts/Montserrat.ttf",
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Risk Reforged — Strategic Conquest & Diplomacy",
  description:
    "Risk Reforged is a Warcraft III custom map and standalone game — a strategic conquest and diplomacy game set in Europe, Asia, and the World.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${frizQuadrata.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
