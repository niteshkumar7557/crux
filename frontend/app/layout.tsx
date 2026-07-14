import type { Metadata } from "next";
import { Manrope, Newsreader, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ConditionalLayout from "./_components/ConditionalLayout";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Crux — The Digital Debate Arena",
    template: "%s · Crux",
  },
  description:
    "Stake a claim, argue both sides, and let logic decide. Crux is a digital arena where every statement is tested by structured debate and AI adjudication.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${manrope.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-body text-on-background">
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
