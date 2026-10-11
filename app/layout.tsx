import "./globals.css";
import type { Metadata, Viewport } from "next";
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

// Barra del navegador móvil con el color de la app y sin bloquear el zoom
// (bloquearlo impide ampliar el texto a quien lo necesita).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#14161f" },
  ],
};

export function generateMetadata(): Metadata {
  return {
    title: "FraguaGo",
    description: translate(getServerLocale(), "meta.description"),
  };
}

// Aplica el tema antes del primer pintado (misma lógica que ThemeToggle):
// sin esto, quien usa tema oscuro veía un destello blanco en cada carga.
const THEME_INIT = `try{var t=localStorage.getItem('fg_theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getServerLocale();
  return (
    // suppressHydrationWarning: la clase "dark" la pone el script antes de React.
    <html lang={locale} className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
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