// Template name to renderer. Every renderer is async because plate images have
// to be read off disk before the element is built — satori components cannot be
// async themselves.

import type { ReactElement } from "react";
import type { TemplateName } from "./socialTokens";
import type { SocialPayload } from "./socialAssets";
import { ArgumentSlide } from "./layout/ArgumentSlide";
import { CoverSlide } from "./layout/CoverSlide";
import { VerdictSlide } from "./layout/VerdictSlide";
import { StoryPoster } from "./layout/StoryPoster";
import { OnePager } from "./layout/OnePager";
import { LivePoster } from "./layout/LivePoster";
import { plateDataUri } from "./socialPlates";

export type Renderer = (payload: SocialPayload) => Promise<ReactElement>;

export const TEMPLATES: Partial<Record<TemplateName, Renderer>> = {
  "ig-argument": async (payload) => <ArgumentSlide payload={payload} />,
  "ig-cover": async (payload) => (
    <CoverSlide payload={payload} plate={await plateDataUri("duel")} />
  ),
  "ig-verdict": async (payload) => (
    <VerdictSlide payload={payload} plate={await plateDataUri("scales")} />
  ),
  "ig-story": async (payload) => (
    <StoryPoster payload={payload} plate={await plateDataUri("scales")} />
  ),
  "li-verdict": async (payload) => (
    <OnePager payload={payload} plate={await plateDataUri("scales")} wide={false} />
  ),
  "x-verdict": async (payload) => (
    <OnePager payload={payload} plate={await plateDataUri("scales")} wide />
  ),
  "ig-live": async (payload) => (
    <LivePoster payload={payload} plate={await plateDataUri("hourglass")} wide={false} />
  ),
  "x-live": async (payload) => (
    <LivePoster payload={payload} plate={await plateDataUri("hourglass")} wide />
  ),
};
