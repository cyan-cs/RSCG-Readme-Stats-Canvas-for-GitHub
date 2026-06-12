import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import LangSetter from "@/components/LangSetter";
import { resolveLocale, translate } from "@/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const acceptLang = headersList.get("accept-language") || "";
  const locale = resolveLocale(acceptLang);
  const title = translate(locale, "metadata.title");
  const description = translate(locale, "metadata.description");
  const siteName = "Readme Stats Canvas for GitHub";

  return {
    title,
    description,
    metadataBase: new URL("https://rscg.cy-an.net"),
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      siteName,
      locale: {
        en: "en_US",
        ja: "ja_JP",
        ko: "ko_KR",
        zh: "zh_CN",
      }[locale],
      images: [
        {
          url: "/api/og",
          width: 1200,
          height: 630,
          type: "image/png",
          alt: "RSCG visual GitHub stats card editor and login count",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/api/og"],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const acceptLang = headersList.get("accept-language") || "";
  const locale = resolveLocale(acceptLang);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0d1117] text-[#e6edf3]">
        <LangSetter locale={locale} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Readme Stats Canvas for GitHub",
              url: "https://rscg.cy-an.net",
            }),
          }}
        />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
