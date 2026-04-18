import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
import { AuthToastListener } from "@/components/auth/AuthToastListener";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DealDrop — Universal Price Tracker",
  description: "Track products from any e-commerce site. Get email alerts the moment the price drops.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthModalProvider>
          {children}
        </AuthModalProvider>
        <Toaster position="top-center" richColors />
        <Suspense fallback={null}>
          <AuthToastListener />
        </Suspense>
      </body>
    </html>
  );
}
