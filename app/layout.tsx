import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata = {
  title: "ResumeUp — Recruiter-grade ATS resume rewrite",
  description:
    "Free ATS preview + keyword gap report. Unlock a recruiter-grade full rewrite with after-score improvements and saved history.",
  openGraph: {
    title: "ResumeUp",
    description:
      "Free ATS preview + full recruiter-grade rewrite with credits.",
    url: "https://resume-saas-psi.vercel.app",
    siteName: "ResumeUp",
    type: "website",
  },
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
        {children}
      </body>
    </html>
  );
}
