import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Orbitron } from 'next/font/google';
import "./globals.css";
import { ClientProviders } from '@/components/layout/ClientProviders';
import { Toaster } from "@/components/ui/Sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({ 
  subsets: ['latin'], 
  weight: ['900'],
  variable: '--font-orbitron' 
});

export const metadata: Metadata = {
  title: "PIXELORBIT",
  description: "Web3 Space Shooter Game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} antialiased`}
      >
        <ClientProviders>
          <div className="pointer-events-none fixed inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-size-[100%_4px,3px_100%]" />
          {children}
          <Toaster
            position="top-center"
          />
        </ClientProviders>
      </body>
    </html>
  );
}