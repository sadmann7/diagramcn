import type { Metadata, Viewport } from "next";

import { SiteHeader } from "@/components/layouts/site-header";
import { ThemeProvider } from "@/components/providers";
import { MAIN_CONTENT_ID, SkipNav } from "@/components/skip-nav";
import { TailwindIndicator } from "@/components/tailwind-indicator";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import { fontMono, fontSans } from "@/lib/fonts";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s - ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "nextjs",
    "react",
    "react server components",
    "shadcn ui",
    "shadcn registry",
    "shadcn registry diagram",
    "json diagram",
    "json editor",
  ],
  authors: [
    {
      name: "sadmann7",
      url: "https://www.sadmn.com",
    },
  ],
  creator: "sadmann7",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og.jpg`],
    creator: "@sadmann17",
  },
  icons: {
    icon: "/favicon.ico",
  },
  manifest:
    process.env.NODE_ENV === "production"
      ? `${SITE_URL}/site.webmanifest`
      : undefined,
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontMono.variable,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SkipNav />
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <main id={MAIN_CONTENT_ID} className="flex-1 scroll-mt-14">
              {children}
            </main>
          </div>
          <TailwindIndicator />
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
