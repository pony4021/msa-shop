// frontend/src/app/layout.tsx
import type { Metadata } from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Shop MSA Frontend",
  description: "Next.js frontend for Shop MSA",
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 md:px-6">
            <Header />
            <main className="flex-1 py-6 md:py-8">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
