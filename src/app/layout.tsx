import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "./providers";
import ReferralBanner from "@/components/common/ReferralBanner";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "Last Paradox Network ⚡ | Freedom • Security • Anonymity",
  description: "Decentralized and secure VPN network platform based on blockchain - Take back control of your online privacy",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>
          {children}
          <ReferralBanner 
            referralCode="l3p0z3udr96rtohg" 
            referralUrl="https:
          />
        </ClientProviders>
      </body>
    </html>
  );
}