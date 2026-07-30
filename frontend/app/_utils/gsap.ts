"use client";

// The single GSAP entry point — plugins are registered once, here. MOTION_OK is the
// reduced-motion query every decorative animation sits behind.

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, useGSAP, SplitText, ScrollTrigger };
