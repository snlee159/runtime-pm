import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { GoogleAnalytics } from "@/components/google-analytics";
import { FaviconHandler } from "@/components/favicon-handler";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Runtime PM - Automated Execution Manager",
  description: "Your personal PM that makes execution decisions",
  icons: {
    icon: "/favicon-dark.svg", // Default to dark (for light mode), will be updated by FaviconHandler
    shortcut: "/favicon-dark.svg",
    apple: "/favicon-dark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-zinc-950 text-white`}>
        {/* Set favicon based on color scheme - runs immediately on client */}
        <Script
          id="favicon-setter"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const faviconPath = isDarkMode ? '/favicon-light.svg' : '/favicon-dark.svg';
                const updateFavicon = (rel, href) => {
                  let link = document.querySelector('link[rel="' + rel + '"]');
                  if (!link) {
                    link = document.createElement('link');
                    link.rel = rel;
                    document.head.appendChild(link);
                  }
                  link.href = href;
                };
                updateFavicon('icon', faviconPath);
                updateFavicon('shortcut icon', faviconPath);
                updateFavicon('apple-touch-icon', faviconPath);
              })();
            `,
          }}
        />
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-DSJDNC8N2G"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-DSJDNC8N2G');
          `}
        </Script>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <FaviconHandler />
        {children}
      </body>
    </html>
  );
}
