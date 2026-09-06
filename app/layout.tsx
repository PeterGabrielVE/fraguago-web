import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { GlobalErrorListener } from "@/components/GlobalErrorListener";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "FraguaGo",
  description: "Gestión de gimnasios",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={cn("font-sans", inter.variable)}>
      <body>
        <GlobalErrorListener />
        {children}
      </body>
    </html>
  );
}