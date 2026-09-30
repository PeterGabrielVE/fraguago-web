import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { GlobalErrorListener } from "@/components/GlobalErrorListener";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { Toaster } from "@/components/ui/toast";
import { I18nProvider } from "@/components/I18nProvider";
import { getServerLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/translate";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export function generateMetadata(): Metadata {
  return {
    title: "FraguaGo",
    description: translate(getServerLocale(), "meta.description"),
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getServerLocale();
  return (
    <html lang={locale} className={cn("font-sans", inter.variable)}>
      <body>
        <AnalyticsProvider />
        <GlobalErrorListener />
        <I18nProvider initialLocale={locale}>
          <Toaster>{children}</Toaster>
        </I18nProvider>
      </body>
    </html>
  );
}