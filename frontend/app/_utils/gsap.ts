"use client";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

// All decorative motion must run inside gsap.matchMedia().add(MOTION_OK, ...)
// so users with prefers-reduced-motion get the server-rendered end state.
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, useGSAP, SplitText, ScrollTrigger };
