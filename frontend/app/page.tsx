// The landing story. Ships its own nav and footer (see ConditionalLayout) and is the
// only page carrying engravings and scroll choreography. See design-system.md §11.
import type { Metadata } from "next";
import LandingNav from "./_components/landing/LandingNav";
import Hero from "./_components/landing/Hero";
import StoryOpen from "./_components/landing/StoryOpen";
import Articles from "./_components/landing/Articles";
import Climb from "./_components/landing/Climb";
import Closing from "./_components/landing/Closing";

export const metadata: Metadata = {
  title: "Crux — Every argument deserves a verdict",
  description:
    "Crux is the digital debate arena: stake a claim, take a side, argue for 48 hours, and an impartial AI judge rules — a winner, a margin, an MVP. Your reasoning becomes your reputation.",
};

/** The story landing page. The live app lives at /arena. */
const LandingPage = () => (
  <div className="landing overflow-x-clip bg-paper font-body text-ink">
    {/* Reveal targets are hidden by default (globals.css) so gsap can fade them
        in. With JS off nothing ever fades them, so put them back. */}
    <noscript
      dangerouslySetInnerHTML={{
        __html: `<style>.landing [data-reveal],.landing [data-hero]{opacity:1}</style>`,
      }}
    />
    <LandingNav />
    <main id="main-content">
      <Hero />
      <StoryOpen />
      <Articles />
      <Climb />
      <Closing />
    </main>
  </div>
);

export default LandingPage;
