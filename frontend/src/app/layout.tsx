import type { Metadata } from "next";
import { Hanken_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatWidget } from "@/components/chat-widget";
import { SessionProvider } from "@/components/session-provider";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-label-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FixMate — Find trusted local artisans in Nigeria",
    template: "%s | FixMate",
  },
  description:
    "Book verified plumbers, electricians, AC technicians, carpenters and more across Nigeria. Pay cash when the job is done. Same-day service available.",
  keywords: ["artisan", "plumber", "electrician", "carpenter", "AC technician", "Nigeria", "Lagos", "Abuja", "home service", "FixMate"],
  openGraph: {
    siteName: "FixMate",
    type: "website",
    locale: "en_NG",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  verification: {
    google: "Q9DU3BHFKP0p8EWENvckXlsO7e25C3N1TRYkuQIS3Fk",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${hankenGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
          <ChatWidget />
        </SessionProvider>
      </body>
    </html>
  );
}
