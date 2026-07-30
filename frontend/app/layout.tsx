// Root layout: three faces, and the theme stamped on <html> before first paint so
// no page flashes the wrong mode. To try a different display face, swap the Anton
// import and keep the variable name — globals.css routes through it.
// See design-system.md §3.
import type { Metadata } from "next";
import { Anton, Newsreader, Space_Grotesk } from "next/font/google";
import "./globals.css";
import ConditionalLayout from "./_components/ConditionalLayout";

// Three faces, no more (design-system.md §3): Anton displays, Newsreader reads,
// Space Grotesk labels. To try a different display face, swap this import
// (e.g. Oswald, League_Gothic, Archivo_Black) and keep the variable name —
// globals.css routes --font-display through --font-anton.
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

// Body and headline both. Manrope used to carry body copy; the design system
// sets the product in the same serif as the landing, so it retired.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Who Crux is, stated once for search engines. Without this nothing tells Google
// that "Crux" is an entity rather than a common noun, which is what a brand query
// has to resolve against. Deliberately NOT a canonical: an `alternates.canonical`
// here would be inherited by every page that does not override it, pointing the
// whole site at "/".
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Crux",
      url: SITE,
      logo: `${SITE}/icon.svg`,
      description:
        "Crux is a debate platform where an AI referee gates every claim, two camps argue for 48 hours, and a neutral AI judge delivers a verdict.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      name: "Crux",
      url: SITE,
      publisher: { "@id": `${SITE}/#organization` },
      inLanguage: "en",
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Crux — The Digital Debate Arena",
    template: "%s · Crux",
  },
  description:
    "Stake a claim, argue both sides, and let logic decide. Crux is a digital arena where every motion is tested by structured debate and AI adjudication.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${newsreader.variable} ${spaceGrotesk.variable} h-full antialiased`}
      // globals.css opts into smooth scrolling; this tells Next the anchor
      // behaviour is deliberate so it stops warning on route transitions.
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Theme lands on <html> before first paint so no page flashes the
            wrong mode. Every surface reads it now, not just the landing. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("crux-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      {/* Column so the footer can be pushed to the viewport bottom on a short
          page (a new debate with no arguments) instead of floating mid-screen. */}
      <body className="min-h-full flex flex-col bg-paper font-body text-ink">
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
